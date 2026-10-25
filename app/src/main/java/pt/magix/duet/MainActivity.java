package pt.magix.duet;
import android.app.Activity;
import android.os.*;
import android.webkit.*;
import android.content.*;
import android.net.Uri;
import android.view.*;
import android.util.AtomicFile;
import androidx.webkit.WebViewAssetLoader;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public final class MainActivity extends Activity {
 private WebView web;
 private final String origin="https://appassets.androidplatform.net";
 private final ExecutorService workers=Executors.newCachedThreadPool(),writer=Executors.newSingleThreadExecutor(),storage=Executors.newSingleThreadExecutor();
 private final AtomicInteger epoch=new AtomicInteger();
 private volatile ServerSocket server;
 private volatile Socket peer;
 private volatile OutputStream output;
 private volatile String roomCode="",lastInvitation="",exportValue="";
 private volatile boolean hosting=false;
 private final Object stateLock=new Object();
 private static final int MAX_PACKET=4*1024*1024,MAX_SAVE=8*1024*1024;
 @Override public void onCreate(Bundle b){
  super.onCreate(b);
  getWindow().setStatusBarColor(0xff16132b);getWindow().setNavigationBarColor(0xff16132b);
  web=new WebView(this);setContentView(web);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setMediaPlaybackRequiresUserGesture(true);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return loader.shouldInterceptRequest(r.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
    String u=r.getUrl().toString();
    if(u.startsWith(origin+"/assets/"))return false;
    if("magix-duet".equals(r.getUrl().getScheme())){lastInvitation=u;emit("invitation",u);return true;}
    if("https".equals(r.getUrl().getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,r.getUrl()));}catch(Exception ignored){}}
    return true;
   }
  });
  web.addJavascriptInterface(new Bridge(),"MagixAndroid");
  if(getIntent().getData()!=null)lastInvitation=getIntent().getData().toString();
  web.loadUrl(origin+"/assets/index.html");
 }
 private void emit(String type,String text){
  try{JSONObject event=new JSONObject();event.put("type",type);event.put("text",text==null?"":text);final String script="window.MagixNativeEvent&&window.MagixNativeEvent("+event.toString()+")";
   runOnUiThread(()->{if(web!=null)web.evaluateJavascript(script,null);});
  }catch(Exception ignored){}
 }
 private static String line(InputStream input,int limit)throws IOException{
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();int c;
  while((c=input.read())!=-1){if(c==10)return bytes.toString(StandardCharsets.UTF_8.name());if(c!=13)bytes.write(c);if(bytes.size()>limit)throw new IOException("Mensagem demasiado grande.");}
  throw new EOFException();
 }
 private void closeNetwork(){
  epoch.incrementAndGet();hosting=false;
  try{if(peer!=null)peer.close();}catch(Exception ignored){}
  try{if(server!=null)server.close();}catch(Exception ignored){}
  peer=null;server=null;output=null;
 }
 private void listen(Socket socket,BufferedInputStream input,int generation){
  long window=System.currentTimeMillis();int messages=0;
  try{
   while(epoch.get()==generation&&!socket.isClosed()){
    String text=line(input,MAX_PACKET);
    long now=System.currentTimeMillis();if(now-window>1000){window=now;messages=0;}
    if(++messages>150)throw new IOException("Demasiadas mensagens.");
    emit("data",text);
   }
  }catch(Exception ignored){}
  finally{if(epoch.get()==generation&&peer==socket){try{socket.close();}catch(Exception ignored){}peer=null;output=null;emit("disconnected","A ligação à outra fada foi interrompida.");}}
 }
 private List<String> addresses(){
  List<String> result=new ArrayList<>();
  try{Enumeration<NetworkInterface> all=NetworkInterface.getNetworkInterfaces();while(all.hasMoreElements()){
   NetworkInterface n=all.nextElement();if(!n.isUp()||n.isLoopback())continue;
   Enumeration<InetAddress> list=n.getInetAddresses();while(list.hasMoreElements()){InetAddress a=list.nextElement();if(a instanceof Inet4Address&&!a.isLoopbackAddress()&&a.isSiteLocalAddress()){if(n.getName().contains("wlan")||n.getName().startsWith("ap"))result.add(0,a.getHostAddress());else result.add(a.getHostAddress());}}
  }}catch(Exception ignored){}
  return result;
 }
 private boolean localAddress(String host){
  try{if(!host.matches("[0-9.]{7,15}"))return false;InetAddress a=InetAddress.getByName(host);return a instanceof Inet4Address&&(a.isSiteLocalAddress()||a.isLinkLocalAddress()||a.isLoopbackAddress());}catch(Exception e){return false;}
 }
 private void host(){
  closeNetwork();final int generation=epoch.get();hosting=true;
  workers.execute(()->{
   try{
    ServerSocket listener=new ServerSocket();listener.setReuseAddress(true);listener.bind(new InetSocketAddress(0));
    if(epoch.get()!=generation){listener.close();return;}server=listener;
    roomCode=String.format(Locale.ROOT,"%08d",new SecureRandom().nextInt(100000000));
    List<String> ips=addresses();JSONObject info=new JSONObject();info.put("port",listener.getLocalPort());info.put("code",roomCode);info.put("addresses",new org.json.JSONArray(ips));
    emit("hosting",info.toString());int failed=0;
    while(epoch.get()==generation&&!listener.isClosed()){
     Socket socket=listener.accept();if(peer!=null){socket.close();continue;}
     try{
      socket.setTcpNoDelay(true);socket.setSoTimeout(10000);
      BufferedInputStream input=new BufferedInputStream(socket.getInputStream());
      JSONObject hello=new JSONObject(line(input,2048));
      if(!roomCode.equals(hello.optString("code"))||hello.optInt("protocol")!=1){
       socket.close();if(++failed>=12){failed=0;roomCode=String.format(Locale.ROOT,"%08d",new SecureRandom().nextInt(100000000));info.put("code",roomCode);emit("hosting",info.toString());}continue;
      }
      if(epoch.get()!=generation){socket.close();break;}
      socket.setSoTimeout(0);peer=socket;output=new BufferedOutputStream(socket.getOutputStream());
      output.write("{\"type\":\"accepted\",\"protocol\":1}\n".getBytes(StandardCharsets.UTF_8));output.flush();
      emit("connected","host");
      workers.execute(()->listen(socket,input,generation));
     }catch(Exception e){try{socket.close();}catch(Exception ignored){}}
    }
   }catch(Exception e){if(epoch.get()==generation)emit("networkError","Não foi possível criar a sala. Liga o Wi-Fi ou um hotspot e tenta novamente.");}
  });
 }
 private void connect(String invitation){
  closeNetwork();final int generation=epoch.get();
  workers.execute(()->{
   Socket socket=new Socket();
   try{
    String host,code;int port;
    if(invitation.startsWith("magix-duet://")){Uri u=Uri.parse(invitation);host=u.getQueryParameter("ip");code=u.getQueryParameter("code");port=Integer.parseInt(u.getQueryParameter("port"));}
    else{String[] p=invitation.trim().split("#",2),address=p[0].split(":",2);host=address[0];port=Integer.parseInt(address[1]);code=p[1];}
    if(host==null||!localAddress(host)||port<1||port>65535||code==null||!code.matches("[0-9]{8}"))throw new IllegalArgumentException();
    socket.connect(new InetSocketAddress(host,port),12000);socket.setTcpNoDelay(true);socket.setSoTimeout(12000);
    OutputStream stream=new BufferedOutputStream(socket.getOutputStream());JSONObject hello=new JSONObject();hello.put("protocol",1);hello.put("code",code);
    stream.write((hello.toString()+"\n").getBytes(StandardCharsets.UTF_8));stream.flush();
    BufferedInputStream input=new BufferedInputStream(socket.getInputStream());JSONObject accepted=new JSONObject(line(input,2048));if(!"accepted".equals(accepted.optString("type")))throw new IOException();
    if(epoch.get()!=generation){socket.close();return;}socket.setSoTimeout(0);peer=socket;output=stream;
    emit("connected","guest");listen(socket,input,generation);
   }catch(Exception e){try{socket.close();}catch(Exception ignored){}if(epoch.get()==generation)emit("networkError","Não foi possível ligar. Confirma o convite e liga os dois telemóveis ao mesmo Wi-Fi ou hotspot.");}
  });
 }
 public final class Bridge {
  @JavascriptInterface public void startHost(){host();}
  @JavascriptInterface public void join(String invitation){if(invitation!=null&&invitation.length()<500)connect(invitation);}
  @JavascriptInterface public void disconnect(){closeNetwork();}
  @JavascriptInterface public void send(String text){
   if(text==null||text.length()>MAX_PACKET||text.indexOf('\n')>=0)return;final Socket socket=peer;if(socket==null)return;
   writer.execute(()->{try{OutputStream stream=output;if(peer!=socket||stream==null)return;stream.write((text+"\n").getBytes(StandardCharsets.UTF_8));stream.flush();}catch(Exception e){try{socket.close();}catch(Exception ignored){}}});
  }
  @JavascriptInterface public String invitation(){String s=lastInvitation;lastInvitation="";return s;}
  @JavascriptInterface public void wifi(){runOnUiThread(()->startActivity(new Intent(android.provider.Settings.ACTION_WIRELESS_SETTINGS)));}
  @JavascriptInterface public String loadState(){
   synchronized(stateLock){File file=new File(getFilesDir(),"state.json");if(!file.exists()||file.length()>MAX_SAVE)return "";
    try(InputStream in=new AtomicFile(file).openRead()){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)bytes.write(buf,0,n);return bytes.toString(StandardCharsets.UTF_8.name());}catch(Exception e){return "";}}
  }
  @JavascriptInterface public void saveState(String value){
   if(value==null||value.length()>MAX_SAVE)return;storage.execute(()->{synchronized(stateLock){
    AtomicFile file=new AtomicFile(new File(getFilesDir(),"state.json"));FileOutputStream out=null;
    try{out=file.startWrite();out.write(value.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}catch(Exception e){if(out!=null)file.failWrite(out);}
   }});
  }
  @JavascriptInterface public void copy(String value){if(value==null||value.length()>10000)return;runOnUiThread(()->{android.content.ClipboardManager manager=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);if(manager!=null)manager.setPrimaryClip(ClipData.newPlainText("Magix Duet",value));});}
  @JavascriptInterface public void share(String value){if(value==null||value.length()>3000)return;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,value);startActivity(Intent.createChooser(i,"Partilhar convite"));});}
  @JavascriptInterface public void shareApk(){workers.execute(()->{try{
   File dir=new File(getCacheDir(),"shared");dir.mkdirs();File target=new File(dir,"Magix-Duet.apk");
   try(InputStream in=new FileInputStream(getApplicationInfo().sourceDir);OutputStream out=new FileOutputStream(target)){byte[] buffer=new byte[32768];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);}
   Uri uri=FileProvider.getUriForFile(MainActivity.this,"pt.magix.duet.files",target);
   runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("application/vnd.android.package-archive");i.putExtra(Intent.EXTRA_STREAM,uri);i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(Intent.createChooser(i,"Enviar Magix Duet"));});
  }catch(Exception e){emit("networkError","Não foi possível partilhar o instalador.");}});}
  @JavascriptInterface public void backup(String value){if(value==null||value.length()>MAX_SAVE)return;exportValue=value;runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"Magix-Duet-Equipa.json");startActivityForResult(i,71);});}
  @JavascriptInterface public void restore(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");startActivityForResult(i,72);});}
  @JavascriptInterface public void vibrate(){runOnUiThread(()->{Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(v!=null&&v.hasVibrator())v.vibrate(VibrationEffect.createOneShot(25,VibrationEffect.DEFAULT_AMPLITUDE));});}
  @JavascriptInterface public void awake(boolean value){runOnUiThread(()->{if(value)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null)return;
  if(request==71){final String value=exportValue;workers.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(data.getData(),"wt")){out.write(value.getBytes(StandardCharsets.UTF_8));emit("backupSaved","Cópia de segurança guardada.");}catch(Exception e){emit("networkError","Não foi possível guardar a cópia.");}});}
  if(request==72)workers.execute(()->{try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] buffer=new byte[8192];int n,total=0;while((n=in.read(buffer))!=-1){total+=n;if(total>MAX_SAVE)throw new IOException();out.write(buffer,0,n);}emit("restore",out.toString(StandardCharsets.UTF_8.name()));
  }catch(Exception e){emit("networkError","Não foi possível abrir esta cópia.");}});
 }
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.getData()!=null){lastInvitation=intent.getData().toString();emit("invitation",lastInvitation);}}
 @Override public void onBackPressed(){if(web!=null)web.evaluateJavascript("window.magixBack?window.magixBack():false",value->{if("false".equals(value))finish();});}
 @Override protected void onPause(){if(web!=null)web.evaluateJavascript("window.magixBackground&&window.magixBackground()",null);super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){closeNetwork();workers.shutdownNow();writer.shutdownNow();storage.shutdown();if(web!=null){web.removeJavascriptInterface("MagixAndroid");web.destroy();web=null;}super.onDestroy();}
}