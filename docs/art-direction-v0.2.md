# Fairycore Y2K — implementação 0.2.0
A direção aprovada foi aplicada aos assets e ao renderer do jogo. As ilustrações são incorporadas no APK; o combate não precisa de internet para carregar imagens.

## Atlas
- fairies.png: seis colunas; corpos ocupam aproximadamente os 66,5% superiores, asas destacadas a faixa inferior de 34%. As pequenas margens sobrepostas são transparentes. O renderer corta as duas faixas em regiões próprias.
- worlds.png: quatro arenas numa grelha 2×2.
- magic.png: 8×5 ícones. Bases 0–9, evoluções 10–19, fusões 20–24, acessórios 25–34, consumíveis 35–39.
- enemies.png: 4×2 sprites. Normais 0–2, elite 3, bosses 4–6, baú 7.

## Animação
Asas separadas, flutuação, inclinação em movimento, gesto de ataque, impacto, rastos, partículas, escudos, ligação cooperativa, reanimação, baús e mudanças de poder. Os efeitos decorativos são calculados localmente; os eventos e a mecânica são decididos pelo anfitrião.

## Interface
A receita principal mostra imagens e níveis. O botão de informação abre uma explicação breve quando solicitada. A receita fixada aparece no HUD por ícones. As contas, backups e recuperação mantêm as instruções necessárias.

## Compatibilidade
Saves v1 são migrados com arena e lista de consumíveis por omissão, conservando o ID da partida. A assinatura é verificada contra o certificado de desenvolvimento usado na versão 0.1.1. Os dois telemóveis devem atualizar para a mesma versão.
