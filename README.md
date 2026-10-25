# Magix Duet
Jogo Android cooperativo de fadas mágicas, inspirado em Winx e em jogos de sobrevivência com ataques automáticos.

[Descarregar APK Android](https://github.com/daniel29lopes/magix-duet/releases/download/v0.2.0/Magix-Duet-0.2.0.apk) · [Compilações e testes](https://github.com/daniel29lopes/magix-duet/actions)

O download só fica disponível quando a compilação e as verificações terminarem com sucesso.

## Jogar a dois
1. Instalem o mesmo APK nos dois telemóveis. Android 8.0+, com Android System WebView atualizado.
2. Criem os perfis locais. Para guardar online, abram **Equipa → Criar conta / Entrar**.
3. Uma pessoa guarda a equipa na cloud e partilha o código de equipa de 12 caracteres. A outra entra com a sua conta e esse código. Também é possível usar a mesma conta nos dois telemóveis, mantendo nomes locais diferentes.
4. Liguem-se ao mesmo Wi-Fi ou um ao hotspot do outro. Não é necessária internet para a partida.
5. **Jogar a dois → Criar sala** num telemóvel; no outro, **Entrar na sala** e colar o convite.
6. O anfitrião inicia a partida e mantém a app aberta. Ambos podem pausar; ambos têm de confirmar para continuar.

A sincronização cloud guarda progresso, conquistas e melhorias. Esta versão não liga partidas entre redes diferentes pela internet.

## Atualização visual 0.2.0
- Direção Fairycore Y2K aplicada: arte ilustrada das seis fadas, asas em camadas e animação de voo.
- Quatro arenas: Floresta de Alfea, Pátio de Alfea, Jardim de Cristal e Reino Lunar.
- Inimigos, elites, bosses e baús ilustrados.
- Ataques com sprites próprios, rastos, partículas, impactos, ondas e animações de fusão.
- Grimório por imagens: arma + acessório + baú → evolução; duas armas evoluídas → fusão.
- Consumíveis: Orvalho de Vida (+30), Bolsa Encantada (+20 moedas), Íman Cósmico (tudo o que é recolhível no ecrã, incluindo baús), Estrela Nova (inimigos e projéteis visíveis; dano parcial em bosses), Bênção de Alfea (5s).
- Animações completas ou suaves nas Definições.
- Guardar e sair a solo conserva a partida para retomar com o mesmo ID.
- Convites podem ser colados com a mensagem completa.
- A compilação verifica que a assinatura coincide com a 0.1.1 antes de publicar.

Instala a 0.2.0 por cima da 0.1.1 e atualiza ambos os telemóveis. O identificador da aplicação e o formato dos saves mantêm-se.

## O jogo
- Bloom, Stella, Flora, Musa, Tecna e Aisha, com armas de origem diferentes.
- 10 armas e 10 acessórios; 4 espaços para cada categoria.
- Evoluções: arma nível 8 + acessório correto nível 5 + baú de boss.
- 5 fusões: duas armas evoluídas + um novo baú.
- Transformações Enchantix e Believix, desbloqueadas para a equipa.
- Bosses progressivos e boss final aos 7:30; limite de 9 minutos.
- Combos elementais, ligação cooperativa e reanimação de uma parceira caída.
- Grimório completo na pausa, com pesquisa e receita fixada.
- 6 melhorias permanentes com 10 níveis; conquistas partilhadas.
- Quatro arenas e dados de conteúdo separados para futuras atualizações.
- Saves automáticos, retoma de partidas a solo e exportação/importação de equipas.
- Botão para partilhar o próprio APK a partir da app.
- Sem anúncios nem compras com dinheiro real.

## Contas e dados
A autenticação usa nome de conta e palavra-passe, com Supabase Auth. Os nomes de conta são identificadores do jogo; não é necessário email. Guarda o código de recuperação mostrado na criação. As palavras-passe não entram nos saves de equipa ou nas cópias exportadas. O único identificador de API incluído na app é a chave publicável; o acesso aos dados exige sessão e pertença à equipa.

O registo de recompensas usa IDs de partida e união de eventos, evitando moedas duplicadas quando ambos guardam a mesma partida. Compras offline simultâneas são ordenadas de forma determinística: o saldo nunca fica negativo; compras sem saldo ficam pendentes e podem ser canceladas no Atelier.

O projeto cloud está na organização do proprietário. O plano atual é Free; aplicam-se as quotas e políticas do fornecedor.

## Desenvolvimento
Node 22, Java 17, Gradle 8.9 e Android SDK 35. Os testes incluem uma verificação online com contas temporárias eliminadas no final.

    npm ci
    npm test
    npm run build
    npm run test:ui
    gradle assembleDebug

O GitHub Actions compila, verifica e publica a versão beta. O APK usa assinatura de desenvolvimento. A chave de desenvolvimento é retida na cache privada de Actions, sujeita à política de retenção do GitHub; uma futura distribuição estável deverá usar uma chave de lançamento guardada pelo proprietário. As credenciais de conta nunca devem ser adicionadas ao repositório.

- src/engine.js: regras de combate e evoluções.
- src/data.js: fadas, armas, receitas, melhorias e temas.
- src/ledger.js: convergência do progresso da equipa.
- src/cloud.js: autenticação e sincronização HTTPS.
- supabase/functions/magix-account: criação de identidades por nome, recuperação e limites de tentativas.
- src/main.js: input, contas e coordenação da partida.
- src/visual-ui.js: interface visual e receitas por imagens.
- src/visual-assets.js: índices dos atlas gráficos e carregamento offline.
- src/art.js: personagens em camadas, partículas e efeitos.
- app/src/main/assets/art: quatro atlas PNG incluídos no APK.
- app/src/main/java/pt/magix/duet/MainActivity.java: aplicação Android, servidor TCP local, backups e partilha.
- supabase/schema.sql: esquema e controlo de acesso.
- supabase/verify.sql: verificações transacionais com dados de teste revertidos.

O protocolo TCP nativo é verificado num teste Java, além do teste cooperativo no navegador. A verificação automática não substitui o teste em dois telemóveis físicos.
