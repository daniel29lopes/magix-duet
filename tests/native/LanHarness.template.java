import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;import java.security.SecureRandom;import java.util.*;import java.util.concurrent.*;import java.util.concurrent.atomic.AtomicInteger;import org.json.JSONObject;
public final class LanHarness{
 private final ExecutorService workers=Executors.newCachedThreadPool(),writer=Executors.newSingleThreadExecutor();
 private final AtomicInteger epoch=new AtomicInteger();
 private volatile ServerSocket server;private volatile Socket peer;private volatile OutputStream output;private volatile String roomCode="";private volatile boolean hosting;
 private static final int MAX_PACKET=4*1024*1024;
 private record Event(String type,String text){}
 private final BlockingQueue<Event> events=new LinkedBlockingQueue<>();
 private void emit(String type,String text){events.add(new Event(type,text));}
 private static final class Uri{
  private final URI uri;private Uri(String s){uri=URI.create(s);}static Uri parse(String s){return new Uri(s);}
  String getQueryParameter(String key){String q=uri.getRawQuery();if(q==null)return null;for(String pair:q.split("&")){String[] p=pair.split("=",2);if(URLDecoder.decode(p[0],StandardCharsets.UTF_8).equals(key))return p.length>1?URLDecoder.decode(p[1],StandardCharsets.UTF_8):"";}return null;}
 }
 __METHODS__
 __SEND__
 private Event next(String type)throws Exception{long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);while(System.nanoTime()<deadline){Event e=events.poll(200,TimeUnit.MILLISECONDS);if(e==null)continue;if(e.type.equals("networkError"))throw new AssertionError(e.text);if(e.type.equals(type))return e;}throw new AssertionError("Timed out waiting for "+type);}
 private void stop(){closeNetwork();workers.shutdownNow();writer.shutdownNow();}
 private static void check(boolean ok,String reason){if(!ok)throw new AssertionError(reason);}
 public static void main(String[] args)throws Exception{
  LanHarness host=new LanHarness(),guest=new LanHarness(),rejoined=new LanHarness();
  try{
   host.host();JSONObject room=new JSONObject(host.next("hosting").text);int port=room.getInt("port");String code=room.getString("code");
   try(Socket invalid=new Socket("127.0.0.1",port)){invalid.setSoTimeout(2000);invalid.getOutputStream().write("{\"protocol\":1,\"code\":\"invalid\"}\n".getBytes(StandardCharsets.UTF_8));invalid.getOutputStream().flush();check(invalid.getInputStream().read()==-1,"Wrong room code was accepted");}
   guest.connect("127.0.0.1:"+port+"#"+code);host.next("connected");guest.next("connected");
   String unicode="{\"name\":\"José ♡ Bloom\",\"x\":123}";host.send(unicode);check(guest.next("data").text.equals(unicode),"Unicode snapshot corrupted");
   guest.send("{\"type\":\"input\",\"x\":1}");check(host.next("data").text.contains("\"x\":1"),"Guest input did not reach host");
   for(int i=0;i<75;i++)host.send("{\"sequence\":"+i+"}");
   for(int i=0;i<75;i++)check(new JSONObject(guest.next("data").text).getInt("sequence")==i,"TCP message ordering failed");
   guest.closeNetwork();host.next("disconnected");
   rejoined.connect("Vamos jogar Magix Duet!\nmagix-duet://join?ip=127.0.0.1&port="+port+"&code="+code+"\nOu cola o convite na app.");host.next("connected");rejoined.next("connected");
   host.send("{\"type\":\"resume\"}");check(rejoined.next("data").text.contains("resume"),"Rejoin could not receive resumed world");
   System.out.println("PASS native LAN: code rejection, two TCP peers, UTF-8, inputs, ordered snapshots and reconnection.");
  }finally{host.stop();guest.stop();rejoined.stop();}
 }
}
