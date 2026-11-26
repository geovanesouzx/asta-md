<p align="center">
  <img 
    src="dados/midias/menu.jpg"
    width="500"
    height="420"
    style="border-radius: 50%; object-fit: cover;"
  />
</p>

<h1 align="center">★彡 ASTA MD 彡★</h1>

<p align="center">
  Dono: <b>★彡 GEOVANE MD 彡★</b> · <a href="https://wa.me/5575920016995">wa.me/5575920016995</a><br>
  <sub>Baseado no projeto open source <a href="https://github.com/DevTokyoVx/nazuna">Nazuna</a> — créditos ao Hiudy e ao DevTokyo</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-ATIVO-success?style=for-the-badge" alt="Status: Ativo" />
  <img src="https://img.shields.io/badge/VERSÃO-v10.9.3-blue?style=for-the-badge" alt="Versão" />
  <img src="https://img.shields.io/github/stars/geovanesouzx/asta-md?style=for-the-badge&color=yellow&label=Estrelas" alt="Estrelas" />
  <img src="https://img.shields.io/github/forks/geovanesouzx/asta-md?style=for-the-badge&color=blue&label=Forks" alt="Forks" />
</p>

<p align="center"><i>Projeto em desenvolvimento contínuo e ativo.</i></p>

<p align="center">
  <a href="https://wa.me/5575920016995">
    <img src="https://img.shields.io/badge/Falar%20com%20o%20Dono-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Falar com o dono" />
  </a>
  <a href="https://github.com/geovanesouzx/asta-md">
    <img src="https://img.shields.io/badge/Repositório-ASTA%20MD-181717?style=for-the-badge&logo=github" alt="Repositório ASTA MD" />
  </a>
  <a href="https://github.com/DevTokyoVx/nazuna">
    <img src="https://img.shields.io/badge/Projeto%20Base-Nazuna-8A2BE2?style=for-the-badge&logo=github" alt="Projeto base Nazuna" />
  </a>
</p>

---

## 📚 Sumário

- [🆕 Novidades da Última Atualização](#-novidades-da-última-atualização)
- [⚔️ Sobre o ASTA MD](#️-sobre-o-asta-md)
- [📊 O Legado em Números](#-o-legado-em-números)
- [📥 Instalação](#-instalação)
  - [📱 Termux (Android)](#-termux-android)
  - [🪟 Windows](#-windows)
  - [🐧 Linux](#-linux)
  - [☁️ VPS (24 horas online)](#️-vps-24-horas-online)
  - [🍎 macOS](#-macos)
  - [🖥️ Hospedagens de bot (Pterodactyl e similares)](#️-hospedagens-de-bot-pterodactyl-e-similares)
- [❓ Perguntas Frequentes](#-perguntas-frequentes)
- [💸 Vale a pena pagar a API?](#-vale-a-pena-pagar-a-api)
- [🏆 Créditos](#-créditos)
- [📜 Termos de Uso](#-termos-de-uso)

---

## 🆕 Novidades da Última Atualização

<p align="center">
  <img src="https://img.shields.io/badge/VERSÃO-v10.9.3-blue?style=for-the-badge" alt="v10.9.3" />
</p>

<details open>
  <summary><strong>✨ Adicionado</strong></summary>

<br>

**🆕 v10.9.3**
- 😴 **Grupos parados**: se um grupo ficar 5 dias sem mensagens de pessoas (as do bot não contam), o dono recebe no privado os botões 🚪 SAIR · ✅ CONTINUAR · 📌 SEMPRE FICAR. `.gruposinativos` lista tudo e tem "sair de todos" com confirmação · `dias 5` · `auto on/off` · `on/off`

**🆕 v10.9.2**
- 🔌 **Conexão mais estável**: no erro 403 o bot não apaga mais a sessão (não precisa escanear o QR de novo); ele espera 1, 3, 10, 30 e 60 minutos e continua tentando. No 503 espera pelo menos 20s antes de reconectar (reconectar rápido demais fazia o WhatsApp responder 403). Antes de apagar uma sessão (401), o bot guarda uma cópia em `dados/database/qr-code-backup`

**🆕 v10.9.1**
- 🔇 **Figurinha sem som**: `.ssoff` (normal), `.scoff` (redonda), `.sqoff` (quadrada), `.scorteoff` (sem tarja), `.sfundooff` (sem fundo), `.sloff <texto>` (legenda), `.s2off` (formato original), `.sefeitooff <efeito>` — também funciona respondendo uma figurinha com som
- 📋 **Menus reorganizados**: cada menu em seções claras, sem comandos repetidos, com uma explicação curta em cada comando, e só com comandos que existem de verdade (o visual do `.designmenu` continua igual)

**🆕 v10.9.0**
- 🔐 **Registro no privado** (`.registropv on`): quem não tem registro recebe um aviso e só consegue usar `.registrar` e `.dono`. O `.registrar Nome|idade` mostra os termos com ✅ ACEITO / ❌ RECUSO e manda um código de 4 números numa imagem (captcha). No fim, a pessoa ganha um número de registro e um cartão. Dono: `.registrados`, `.desregistrar`
- `.inativos [dias]` → lista quem não fala há X dias, com botão para remover que **só admins** confirmam
- `.regrasaceite on` → o novato recebe as regras e precisa tocar em ✅ LI E ACEITO para poder falar
- `.antilinkpro on` + `.linkspermitidos add youtube tiktok` → só passam links dos sites liberados (a lista vale também para o antilinkhard e o antilinksoft)
- `.modonoturno 23:00 07:00` → o grupo fecha e abre sozinho com mensagem de boa noite e de bom dia
- `.bvcard on [tema]` → cartão de boas-vindas em imagem (foto de perfil, nome e "Membro nº"), 7 temas
- `.lojinha` (ou `.loja` sem Modo RPG) → títulos, cor do perfil, 🛡️ escudo contra roubo (24h) e ⚡ bônus em dobro de 💰 (1h) · `.meuperfil` → cartão com título e cor · `.titulo`
- Pedidos de namoro/casamento com botões 💍 ACEITO / 💔 RECUSO · `.casal` mostra há quantos dias o casal está junto · presentes automáticos de mêsversário (+100 💰) e aniversário de casamento (+500 💰)
- `.torneio criar 8 [prêmio]` → torneio de duelos de magia com chave automática (4, 8 ou 16) e prêmio para o campeão (com Modo RPG ligado: `.torneio magia`)
- `.forcaanime` → forca de animes e personagens com lista de letras
- `.quemdisse` → o bot mostra uma frase do grupo e a galera adivinha quem mandou
- `.pet` → pet virtual (espíritos de Black Clover): alimentar, brincar, treinar, evoluir… e ele foge se for abandonado

**🆕 v10.8.0**
- `.sefeito lento / rapido / reverso / vaievolta / espelho` → efeitos na figurinha animada, **com o som acompanhando** (`mudo` tira o som)
- `.svoz grave / esquilo / robo / eco / radio / monstro / reverso` → efeito de voz em figurinha com som, áudio ou vídeo
- `.trocarsom` → troca o som de uma figurinha (responda a figurinha e o áudio, em qualquer ordem)
- `.sfala <texto>` → figurinha com o texto escrito e uma voz falando (Vex API ou voz grátis do Google)
- `.topfig` → as figurinhas mais mandadas do grupo · `.topfig pegar 1` reenvia · `.topfig zerar`
- **Cache de figurinhas**: a mesma mídia com as mesmas opções não é convertida de novo (fica instantâneo)
- `.agendar todo dia 08:00 Bom dia!` · `toda segunda` · `dias uteis` · `fim de semana` → mensagem que repete
- **Parabéns automático** no dia do aniversário (`.aniversario auto on/off` · `.aniversario hora 09:00`)
- `.antifig limite 5` → antiflood: cada membro pode mandar até 5 figurinhas por minuto (pega as com som também)
- `.bvfig` → figurinha (com som 🔊) enviada para quem entra no grupo
- `.duelo @fulano [aposta]` → **duelo de magia Black Clover** com grimório aleatório e botões ATAQUE / MAGIA / DEFESA / CURA, prêmio em 💰 e `.duelo rank` (o duelo de perguntas continua em `.dueloquiz`)
- `.adivinha` → **qual é o anime?** com imagem borrada que vai clareando, `dica`, `rank` e +50 💰
- `.permsub @fulano tm` → subdono com permissões escolhidas (ex.: só o `.tm`) · `tudo` · `limpar`
- **Painel web com controle** (`.painelweb on`): mandar transmissão para todos os grupos, ligar/desligar funções e reiniciar o bot pelo navegador
- `.bangeral` → remove **todos os membros** do grupo (admins, bot e dono ficam), com botões ✅ CONFIRMAR / ❌ RECUSAR que só admins podem apertar

**🔊 Figurinhas com som (o recurso novo do WhatsApp)**
- `.s` respondendo um **áudio, nota de voz ou música** → figurinha com som (capa automática com a onda do som)
- Foto com legenda `.s` respondendo um áudio → a foto vira a capa da figurinha com som
- `.s` em **vídeo com som** → figurinha animada com o som do vídeo (até 30s)
- `.s 15` (usa 15s) · `.s 1:05 10` (começa em 1:05 e dura 10s) · `.s mudo` (sem som) · `.s circulo`
- Em músicas longas o bot escolhe sozinho o trecho mais forte (normalmente o refrão)
- `.ssom <link do TikTok>` → figurinha animada com o som do vídeo
- `.ssom <link do YouTube ou nome da música>` → capa + música
- `.somfig` → tira o som de uma figurinha (como nota de voz ou arquivo de música)
- `.tovideo` → figurinha animada vira vídeo (com o som)
- `.autosticker` → vídeos com som viram figurinha com som (`.autosticker som on/off`)
- `.soundinfo` → relatório técnico de uma figurinha (diagnóstico)

**🎨 Novos comandos de figurinha**
- `.squadrado` (ou `.sq`) → corta foto/vídeo/figurinha em quadrado 1:1 **de verdade** (sem esticar e sem bordas), com som · `.squadrado cima / baixo / esquerda / direita`
- `.scorte` → acha e corta a **tarja preta** (em cima/embaixo ou nas laterais) e mantém o som. Se a mídia não tiver tarja, nada é cortado
- `.sfundo` → tira o fundo de **fotos, vídeos e figurinhas** no próprio aparelho (sem API), vídeo mantém o som · `.rmbg` devolve PNG transparente · `.instalarfundo` (dono, uma vez)
- `.sc` → figurinha redonda · `.sl <texto>` → figurinha com legenda estilo meme
- `.pack add / ver / nome / limpar` → monte seu pacote de figurinhas
- Figurinha de **visualização única** (foto, vídeo e áudio) com `.s` respondendo ou com o comando na legenda

**👁️ Visualização única**
- `.revelar` (ou `.abrir` / `.rvisu`) → reenvia a foto, vídeo ou áudio de visualização única · `.revelar pv` manda no privado
- O bot guarda as visualizações únicas recebidas por 24h e pede o arquivo ao celular principal quando o WhatsApp manda só o aviso

**📋 Menu com botões**
- `.menu` → banner + botões **PRINCIPAL / LISTA / FALAR COM O DONO** · `.menu texto` → menu em texto
- Submenus com ⬅️ VOLTAR e 📜 MENU COMPLETO · `.play <música>` com botões 🎵 ÁUDIO / 🎬 VÍDEO
- Botões funcionam com **qualquer prefixo**, até em menus enviados antes de trocar o prefixo

**🎮 Diversão**
- `.quizanime` / `.quizrank` → quiz de anime com botões (+1 ponto e 50 💰)
- `.sorteiobotao 10m <prêmio>` → sorteio com botão 🎟️ PARTICIPAR e resultado automático
- `.figdia on [HH:MM]` → figurinha do dia no grupo
- `.rankingsemanal on` → top 10 da semana todo domingo + prêmio 💰
- `.cargos` → títulos por nível (tema Black Clover ⚔️)

**🛡️ Administração do grupo**
- `.punir @fulano` → painel ⚠️ ADVERTIR / 🔇 SILENCIAR 1H / 🚫 BANIR
- `.mutar @fulano 30m` → silencia por tempo (apaga as mensagens até o prazo)
- `.verificarnovato on` → quem entra precisa tocar em ✅ SOU HUMANO
- `.bvbotoes on` → botões 📜 REGRAS e 📋 MENU nas boas-vindas
- `.resumo` / `.resumo semana` → quem mais falou, horário de pico, entradas e saídas
- `.agendar HH:MM <mensagem>` (texto, foto, vídeo, figurinha...) · `.agendados` · `.desagendar <n>`
- `.votacao 30m Pergunta | opção 1 | opção 2` → votação com resultado automático
- `.evento Nome | DD/MM HH:MM | Local` → evento nativo do WhatsApp
- `.assistentevoz on` → o Asta responde também em áudio 🎙️

**🧠 IA e utilidades**
- IA com a personalidade do **Asta**: determinado, leal e motivador (`.assistente asta`)
- `.resumir` → a IA resume a conversa do grupo
- `.lembrete` agora chega com botões ⏰ ADIAR 10 MIN / ✅ FEITO

**👑 Dono**
- `.tm` → transmissão de **qualquer coisa** (foto, vídeo, GIF, figurinha com som, enquete, áudio, documento, evento, localização, contato...) com prévia e botões ✅ ENVIAR / ❌ CANCELAR
- `.tm enquete Pergunta | a | b` · `.tm direto <texto>` · `.tmparar` · `.tmexcluir` · `.tmincluir` · `.tmexcluidos` · `.tmprevia on/off` · `.tmcanal <link>`
- `.divdono img / video / gif / fig / audio / voz / doc / enquete / evento / local / contato / tudo`
- `.divdono salvar` → divulgação agendada com mídia em rodízio · `.divdono itens / veritem / enviaritem / remitem / limparitens`
- `.status` → saúde do bot (conexão, fila, memória, backups) · `.logs` · `.avisos on/off`
- `.manutencao on/off` → só o dono usa comandos
- `.painelweb on/off` → painel do bot no navegador
- `.backupdados` · `.backupsemanal on/off` → backup dos dados (sem a sessão)
- `.figfps qualidade / auto / 30` · `.figfps ate 15` → fluidez × nitidez das figurinhas
- `.menubotoes on/off` · `.autoreload on/off` · `.cargos asta` / `.cargos padrao`

**⚙️ Sistema**
- 📱 **Termux sempre ligado:** liga ao abrir o Termux e ao ligar o celular (Termux:Boot), religa se fechar, sem duplicar · figurinhas usando todos os núcleos do celular
- 🔄 `.atualizar` → atualiza o bot direto do GitHub, sem Git e sem mexer em arquivos (mantém sessão, dados, config e banner), com backup e reinício automático. O bot avisa o dono quando sai versão nova (`.atualizar aviso on/off`)
- ♻️ Reinício automático quando os arquivos do bot mudam (é só extrair a atualização por cima)
- 💾 Backup diário automático da sessão (não precisa escanear o QR de novo)
- 🔔 Aviso de aluguel vencendo com botões 🔄 RENOVAR / 📞 FALAR COM O DONO
- 🔌 Se a conexão cair no meio do envio de uma figurinha, o bot espera reconectar e reenvia
- 📦 Instala sozinho a versão compatível do módulo de figurinhas (sharp) quando o aparelho não tem versão pronta (Termux/Android)
- 🖱️ Para Windows: `iniciar.bat` (dois cliques) abre o bot da pasta certa e reinicia se fechar
</details>

<details open>
  <summary><strong>🔧 Corrigidos</strong></summary>

<br>

- No Termux, o autostart antigo abria **uma cópia nova do bot** cada vez que o Termux era aberto (causava quedas e "Bad MAC") → refeito
- "Comando não encontrado" ao fazer **figurinhas em lote** (comando com Enter depois, caracteres invisíveis do copiar/colar, fotos enviadas em álbum) → corrigido, e as conversões agora entram numa fila em vez de sobrecarregar o computador
- `.tm` e `.divdono` transmitiam figurinha **sem o som** → agora transmitem com som
- Comandos que mexem em figurinha (take, rename, pack, sl, sc, s2, hidetag, automsg, comandos personalizados...) perdiam o som → agora mantêm
- Som da figurinha no **iPhone**: a figurinha agora vai com os mesmos campos que o celular manda
- Figurinhas animadas travadas/pixeladas → até 512px, **30 fps até 15s** e sempre abaixo do limite de ~1MB do WhatsApp
- Figurinha de vídeo que já tinha menos de 1MB saía pixelada → agora mantém a qualidade
- Erro `Unrecognized option 'vsync'` do FFmpeg novo
- Botões do menu paravam de funcionar depois de trocar o prefixo
- Botões ✅ ENVIAR / ❌ CANCELAR do `.tm` não respondiam em alguns aparelhos (e agora também dá para digitar `.tmconfirmar` / `.tmcancelar`)
- O antibotão removia quem só clicava nos botões do menu
- `.revelar` mandava a foto corrompida
- Erro `Could not load the "sharp" module` na instalação (a instalação usava `--no-optional`)
- Avisos falsos `Erro ao ler configurações do grupo ... ENOENT`
- O configurador (`npm run config`, que roda quando falta o `config.json`) dava `Erro fatal: off is not defined` e nunca funcionava → corrigido, e agora cria um `config.json` completo do ASTA MD
- Aviso `DeprecationWarning DEP0190` no Windows
- Fotos e vídeos enviados **juntos (álbum)** eram ignorados pelos comandos de figurinha → agora funcionam
- Em grupos com **mensagens temporárias**, alguns comandos não achavam a mídia → corrigido
- O atualizador antigo (`.atualizar`) baixava a Nazuna original e apagava o ASTA MD → refeito, agora atualiza pelo repositório do ASTA MD
- Aviso `[EXPORTS] Module 'Logos2' not found` no console
</details>

<details open>
  <summary><strong>⚡ Comandos Melhorados</strong></summary>

<br>

- `.s` / `.sticker` — som, trechos (`.s 1:05 10`), redonda, visualização única, até 30s e 512px
- `.tm` — qualquer tipo de mensagem, prévia com botões, envio em segundo plano, canal
- `.divdono` — todos os tipos de mídia, itens salvos em rodízio, figurinha com som
- `.sfundo` / `.sbg` — agora no próprio aparelho, também em vídeo e figurinha
- `.revelar` — foto, vídeo e áudio, com opção de mandar no privado
- `.menu` — com banner e botões
- `.play` — botões de áudio e vídeo
- `.lembrete` — botões de adiar e concluir
- `.mutar` — com tempo
- `.autosticker` — com som
- `.take` / `.rename` / `.pack` — mantêm o som
- `.assistente` — personalidade do Asta
- `.atualizar` — funcionando de novo: pelo GitHub do ASTA MD, com botões, backup e aviso de versão nova
</details>

---

## ⚔️ Sobre o ASTA MD

O **ASTA MD** é uma versão modificada e ampliada da **[Nazuna Bot](https://github.com/DevTokyoVx/nazuna)**, mantida por **★彡 GEOVANE MD 彡★**.

A Nazuna foi criada pelo **[Hiudy](https://github.com/hiudyy)** e hoje é mantida pelo **[DevTokyo](https://github.com/DevTokyoVx)**. O ASTA MD parte dessa base e adiciona figurinhas com som, menu com botões, transmissões completas, novos comandos de figurinha, visualização única e muito mais, com tema masculino inspirado no Asta (Black Clover ⚔️).

Este repositório é **público e open source**. O ASTA MD **não é a versão oficial da Nazuna** — para a Nazuna original, acesse o [repositório do DevTokyo](https://github.com/DevTokyoVx/nazuna).

> ⚔️ *Desistir não é o meu tipo de magia!*

---

## 📊 O Legado em Números

<div align="center">

| Métrica | Valor |
|---------|-------|
| 🏷️ Versão atual | ![Versão](https://img.shields.io/badge/v10.9.3-blue?style=flat-square) |
| 🧩 Comandos e atalhos | ![Comandos](https://img.shields.io/badge/+1700-brightgreen?style=flat-square) |
| ⭐ Estrelas | ![Stars](https://img.shields.io/github/stars/geovanesouzx/asta-md?style=flat-square&color=yellow) |
| 🍴 Forks | ![Forks](https://img.shields.io/github/forks/geovanesouzx/asta-md?style=flat-square&color=blue) |
| 📝 Commits | ![Commits](https://img.shields.io/github/commit-activity/t/geovanesouzx/asta-md?style=flat-square&color=purple) |
| 💾 Tamanho do Repo | ![Size](https://img.shields.io/github/repo-size/geovanesouzx/asta-md?style=flat-square&color=orange) |
| 🕒 Última atualização | ![Last commit](https://img.shields.io/github/last-commit/geovanesouzx/asta-md?style=flat-square&color=lightgrey) |
| 🌐 Linguagem Principal | ![Language](https://img.shields.io/github/languages/top/geovanesouzx/asta-md?style=flat-square&color=teal) |
| 🧬 Projeto base | [![Nazuna](https://img.shields.io/github/stars/DevTokyoVx/nazuna?style=flat-square&label=Nazuna&color=8A2BE2)](https://github.com/DevTokyoVx/nazuna) |

</div>

<p align="center">
  <img src="https://count.getloli.com/@asta-md?name=asta-md&theme=booru-lewd&padding=8&offset=0&align=top&scale=2&pixelated=1&darkmode=1" alt="Visitas" />
  <br/>
  <sub>Total de visitas ao repositório</sub>
</p>

---

## 📥 Instalação

> **Requisitos:** Node.js 20 ou mais novo, Git e FFmpeg. Os comandos abaixo já instalam tudo.
> Na primeira vez, o bot instala as dependências sozinho e pergunta como conectar (**QR Code** ou **código de pareamento**).

### 📱 Termux (Android)

Copie e cole **um único comando** no Termux:

```bash
yes | pkg update -y && yes | pkg upgrade -y -o Dpkg::Options::=--force-confnew && pkg install -y git ffmpeg && (command -v node >/dev/null 2>&1 || pkg install -y nodejs-lts) && cd ~ && (test -d asta-md || git clone --depth 1 https://github.com/geovanesouzx/asta-md) && cd asta-md && npm start
```

O que esse comando faz:
1. Atualiza o Termux e responde "sim" sozinho às perguntas da atualização.
2. Instala o Git, o FFmpeg e o Node.js (se você ainda não tiver).
3. Baixa o ASTA MD na pasta pessoal do Termux (se já estiver baixado, não apaga nada).
4. Instala as dependências e liga o bot.
5. Pergunta **uma vez** se o bot deve ficar **sempre ligado** — responda `s`.

**🔋 Bot sempre ligado no celular**
- Ao abrir o Termux, o bot liga sozinho em segundo plano (nunca abre duas cópias).
- Se o bot fechar ou travar, ele religa sozinho em 5 segundos.
- Para ligar também quando o **celular reiniciar**: instale o app **[Termux:Boot](https://f-droid.org/packages/com.termux.boot/)** (F-Droid) e abra ele uma vez.
- Em **Configurações → Apps → Termux → Bateria**, escolha **Sem restrições** (senão o Android fecha o Termux).
- Comandos no Termux: `asta-log` (ver o console) · `asta-parar` · `asta-reiniciar` · `asta-iniciar`
- As figurinhas usam todos os núcleos do processador do celular (menos 1, para o bot continuar respondendo).

<details>
  <summary><strong>📌 Dicas e problemas comuns no Termux</strong></summary>

<br>

- **Use o Termux do [F-Droid](https://f-droid.org/packages/com.termux/) ou do [GitHub](https://github.com/termux/termux-app/releases).** O Termux da Play Store está abandonado e não instala mais pacotes.
- **Erro de repositório / mirror** (`unable to locate package`, `repository is under maintenance`): rode `termux-change-repo`, escolha outro mirror e cole o comando de novo.
- **Instale na pasta pessoal (`~`), não em `/sdcard`.** O armazenamento compartilhado não aceita links simbólicos e o `npm` falha lá.
- O módulo de figurinhas (sharp) não tem versão pronta para Android. O bot detecta isso e instala sozinho a versão compatível (WebAssembly).
- `.sfundo` em vídeo e o `.instalarfundo` não funcionam no Termux (o removedor de fundo local não roda no Android). Em foto, o `.sfundo` usa a API.
- **Para ligar de novo depois:** `asta-iniciar` (ou `cd ~/asta-md && sh iniciar.sh`)
- **Para atualizar:** `cd ~/asta-md && git pull && npm start`
</details>

### 🪟 Windows

**Opção 1 — PowerShell (um único comando):** abra o **PowerShell** e cole:

```powershell
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements; winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements; winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements; $env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User'); cd $HOME; if (!(Test-Path asta-md)) { git clone --depth 1 https://github.com/geovanesouzx/asta-md }; cd asta-md; npm.cmd start
```

**Opção 2 — CMD (Prompt de Comando):**

1. Instale os programas:
```bat
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements & winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements & winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
```
2. **Feche e abra o CMD de novo** (para ele enxergar os programas novos) e cole:
```bat
cd %USERPROFILE% && git clone --depth 1 https://github.com/geovanesouzx/asta-md && cd asta-md && npm start
```

**Depois de instalado:** dê dois cliques no **`iniciar.bat`** dentro da pasta `asta-md`. Ele abre o bot da pasta certa e reinicia sozinho se o bot fechar.

<details>
  <summary><strong>📌 Sem winget?</strong></summary>

<br>

O winget vem no Windows 10 (atualizado) e no Windows 11. Se não tiver, instale manualmente:
- Node.js LTS: https://nodejs.org
- Git: https://git-scm.com/download/win
- FFmpeg: https://www.gyan.dev/ffmpeg/builds/ (baixe o *full*, extraia em `C:\ffmpeg` e adicione `C:\ffmpeg\bin` ao PATH)

Depois, use o passo 2 da Opção 2.
</details>

### 🐧 Linux

**Ubuntu / Debian / Mint (e VPS com esses sistemas):**

```bash
sudo apt update && sudo apt install -y git ffmpeg curl ca-certificates && curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs && (test -d asta-md || git clone --depth 1 https://github.com/geovanesouzx/asta-md) && cd asta-md && npm start
```

**Fedora:**

```bash
sudo dnf install -y git nodejs npm ffmpeg-free && (test -d asta-md || git clone --depth 1 https://github.com/geovanesouzx/asta-md) && cd asta-md && npm start
```

**Arch / Manjaro:**

```bash
sudo pacman -Syu --noconfirm git nodejs npm ffmpeg && (test -d asta-md || git clone --depth 1 https://github.com/geovanesouzx/asta-md) && cd asta-md && npm start
```

### ☁️ VPS (24 horas online)

1. Instale com o comando do **Linux** acima (a maioria das VPS usa Ubuntu ou Debian).
2. Na primeira vez, conecte o WhatsApp (QR Code ou código) e espere aparecer que conectou.
3. Aperte `Ctrl + C` e deixe o bot rodando em segundo plano com o **PM2**:

```bash
sudo npm install -g pm2 && pm2 start npm --name asta-md -- start && pm2 save && pm2 startup
```

Comandos úteis: `pm2 logs asta-md` (ver o console) · `pm2 restart asta-md` · `pm2 stop asta-md`

### 🍎 macOS

```bash
brew install node git ffmpeg && (test -d asta-md || git clone --depth 1 https://github.com/geovanesouzx/asta-md) && cd asta-md && npm start
```

> Precisa do [Homebrew](https://brew.sh) instalado.

### 🖥️ Hospedagens de bot (Pterodactyl e similares)

1. Baixe o projeto em **Code → Download ZIP** e envie para a hospedagem.
2. Use uma imagem/egg de **Node.js 20 ou mais novo** com **FFmpeg**.
3. Comando de inicialização: `npm start`
4. Conecte pelo console com o **código de pareamento** (mais fácil que o QR em painel).

---

# ❓ Perguntas Frequentes

<details>
  <summary><strong>💰 É pago?</strong></summary>

Não. O ASTA MD é gratuito e open source.

Alguns comandos usam a Vex API, que é paga (veja [Vale a pena pagar a API?](#-vale-a-pena-pagar-a-api)).
</details>

<details>
  <summary><strong>🛠️ O projeto ainda recebe atualizações?</strong></summary>

Sim. O ASTA MD continua em desenvolvimento ativo pelo ★彡 GEOVANE MD 彡★.
</details>

<details>
  <summary><strong>🔄 Como atualizar o bot?</strong></summary>

**Pelo WhatsApp (mais fácil):** mande `.atualizar` no privado do bot (só o dono).
O bot mostra a versão nova e o que mudou. Toque em **✅ ATUALIZAR AGORA** (ou digite `.atualizar sim`) e pronto: ele baixa, aplica, instala o que precisar e reinicia sozinho.

O que **não** muda: a sessão do WhatsApp, os dados dos grupos e usuários (`dados/database`), o seu `config.json` (só ganha opções novas), o seu banner e as suas mídias. Antes de trocar qualquer arquivo, o bot faz um backup em `dados/database/backups-atualizacao`.

- `.atualizar aviso on/off` → o bot te avisa no privado quando sair versão nova (ligado por padrão)
- `.atualizar forcar` → reinstala a versão do GitHub mesmo sem versão nova
- Pelo terminal: `npm run update`

> Quem está numa versão **anterior à v10.7.4** precisa atualizar uma vez do jeito manual (baixar o ZIP e extrair por cima, ou `git pull`). Depois disso, o `.atualizar` faz tudo sozinho.
</details>

<details>
  <summary><strong>📱 Funciona em qualquer celular?</strong></summary>

Sim, desde que o WhatsApp seja compatível com multi-dispositivos (aparelhos conectados).
</details>

<details>
  <summary><strong>🔊 A figurinha com som não toca para algumas pessoas</strong></summary>

O som só aparece para quem já tem o recurso de figurinha com som no WhatsApp (atualize o app). Quem ainda não tem vê uma figurinha comum.
</details>

<details>
  <summary><strong>⚡ Figurinhas demorando ou o celular/PC esquentando</strong></summary>

O bot converte várias figurinhas ao mesmo tempo numa fila: no **PC**, metade dos núcleos do processador (2 a 4); no **Termux**, todos os núcleos menos 1. Num lote grande, as figurinhas esperam a vez em vez de dar erro.

Para mudar, coloque no `dados/src/config.json`:

```json
"ffmpegSimultaneos": 3
```

- Número **maior** → lotes mais rápidos (esquenta mais)
- Número **menor** → mais leve para o aparelho

No Termux, deixe o bot com o **wake lock** ativo (ele ativa sozinho) e a bateria do Termux em **Sem restrições**, senão o Android deixa o processador lento com a tela apagada.
</details>

<details>
  <summary><strong>🔐 Aparece "Bad MAC" / "Failed to decrypt message" no console</strong></summary>

É normal em bots: a "chave de conversa" com alguma pessoa ficou desatualizada. O WhatsApp pede para reenviar a mensagem e a chave se acerta sozinha.

Se ficar repetindo **sempre com o mesmo número**: desligue o bot e apague, em `dados/database/qr-code`, só os arquivos que começam com `session-NUMERO`. **Nunca** apague o `creds.json` (senão precisa conectar de novo).

⚠️ Se aparecer com muita gente o tempo todo, confira se não tem **duas cópias do bot ligadas** com o mesmo número (no Termux, use `asta-parar` e depois `asta-iniciar`).
</details>

<details>
  <summary><strong>👤 Como virar dono do bot?</strong></summary>

1️⃣ Ligue o bot e use o comando `.lid` (`.` = prefixo do bot)

2️⃣ Abra o arquivo `dados/src/config.json`

3️⃣ Procure por `"lidowner"`

4️⃣ Troque o valor pelo que o bot te enviou no `.lid` — exemplo: `"lidowner": "848285828@lid"`

5️⃣ Troque também `"numerodono"` e `"nomedono"` pelos seus

6️⃣ Salve, reinicie o bot e use os comandos de dono!
</details>

<details>
  <summary><strong>*️⃣ Como alterar o prefixo do bot?</strong></summary>

Com o número do dono configurado, use `.prefixo` seguido do novo símbolo:

```
.prefixo !
```

Os botões do menu continuam funcionando com qualquer prefixo.
</details>

<details>
  <summary><strong>💸 Como ativar e configurar a chave da API?</strong></summary>

1️⃣ Crie sua conta em https://vexapi.com.br e escolha um plano em https://vexapi.com.br/plans

2️⃣ No painel (https://vexapi.com.br/docs), copie sua API-key

3️⃣ Com o número do dono configurado, use:

```
.apikey SUA_CHAVE_AQUI
```

4️⃣ Espere o bot reiniciar e use os comandos que dependem da API.

🔒 Nunca envie seu `config.json` para ninguém: ele guarda a sua chave.
</details>

<details>
  <summary><strong>🔧 Posso usar minha própria API?</strong></summary>

Pode, mas não damos suporte. O bot já vem integrado com a Vex API para facilitar.
</details>

<details>
  <summary><strong>🤝 Como contribuir?</strong></summary>

Abra uma Issue ou um Pull Request neste repositório, ou fale com o dono pelo [WhatsApp](https://wa.me/5575920016995).
</details>

---

# 💸 Vale a pena pagar a API?

O bot funciona muito bem sem a API, mas com a **Vex API** você libera comandos de download, edição de imagem, música e muito mais:

<div align="center">

| Comando | Descrição |
|---------|-----------|
| 🎵 `play` | Baixa um áudio com informações de um vídeo do YouTube |
| 🎬 `playvid` | Baixa um vídeo diretamente do YouTube |
| 📱 `tiktok` | Baixa vídeos do TikTok sem marca d'água |
| 📸 `instagram` | Baixa fotos e vídeos do Instagram |
| 📘 `facebook` | Baixa vídeos do Facebook |
| 🎞️ `kwai` | Baixa vídeos do Kwai |
| 📌 `pinterest` | Baixa imagens e vídeos do Pinterest |
| ✂️ `removebg` | Remove o fundo de uma foto (sem o `.instalarfundo`) |
| 🖼️ `canvas de welcome` | Gera uma imagem de boas-vindas personalizada para o grupo |
| 🎤 `letra` | Busca a letra de uma música |
| 🟢 `spotify download` | Baixa músicas diretamente do Spotify |
| 🅰️ `logos 1 texto` | Gera logos estilizadas com um texto |
| 🅱️ `logos 2 textos` | Gera logos estilizadas com dois textos |
| 📃 `transcrever` | Converte áudios para texto |
| 📑 `autotranscrever` | Detecta áudios no grupo e transforma em texto |
</div>

> Acesse [vexapi.com.br/plans](https://vexapi.com.br/plans) e escolha o plano ideal para o seu uso.

---

## 🏆 Créditos

<p align="center">
  <img src="https://img.shields.io/badge/OBRIGADO-❤️-ff69b4?style=for-the-badge" />
</p>

<div align="center">

| Quem | Papel |
|------|-------|
| 👑 **★彡 GEOVANE MD 彡★** · [wa.me/5575920016995](https://wa.me/5575920016995) | Dono e desenvolvedor do **ASTA MD** |
| 🧬 **[DevTokyo](https://github.com/DevTokyoVx)** | Mantenedor atual da **[Nazuna Bot](https://github.com/DevTokyoVx/nazuna)**, base deste projeto |
| 🌱 **[Hiudy](https://github.com/hiudyy)** | Criador original da Nazuna Bot |
| 🤝 **Contribuidores da Nazuna** | Tudo o que construíram até aqui |
| 📚 **[Baileys](https://github.com/WhiskeySockets/Baileys)** | Biblioteca de conexão com o WhatsApp |

</div>

<p align="center">Contribuidores da Nazuna, base do ASTA MD:</p>

<p align="center">
  <a href="https://github.com/DevTokyoVx/nazuna/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=DevTokyoVx/nazuna&columns=10&anon=1" />
  </a>
</p>

<p align="center">
  <sub>ASTA MD por ★彡 GEOVANE MD 彡★ • Baseado na <a href="https://github.com/DevTokyoVx/nazuna">Nazuna</a> (Hiudy & DevTokyo)</sub>
</p>

---

## 📜 Termos de Uso

> Ao utilizar o ASTA MD, você concorda com os termos abaixo.

<details>
  <summary><strong>📌 Clique aqui para ler os Termos de Uso completos</strong></summary>

<br>

### 🔓 Uso Open Source
O ASTA MD é **open source** e deve permanecer assim. Ele é baseado na Nazuna Bot, que também é open source: **mantenha os créditos** ao ASTA MD e à Nazuna (Hiudy e DevTokyo) em qualquer cópia ou versão modificada. O arquivo original **não pode ser comercializado**.

### 🏷️ Não é a versão oficial da Nazuna
O ASTA MD é uma versão modificada e **não é** uma versão oficial do projeto Nazuna. O repositório oficial da Nazuna é mantido pelo [DevTokyo](https://github.com/DevTokyoVx/nazuna), único responsável pelas versões oficiais dela.

### 🔄 Modificações
Você pode clonar e modificar o ASTA MD livremente para uso próprio, mantendo os créditos.

### ⚠️ Isenção de Responsabilidade
Não nos responsabilizamos caso seu número seja **banido do WhatsApp**. O WhatsApp está em constante atualização e proíbe cada vez mais o uso de bots. Use com consciência e por sua conta e risco.

<br>
<p align="center">
  <sub>Estes termos podem ser atualizados a qualquer momento pelo mantenedor do projeto.</sub>
</p>

</details>
