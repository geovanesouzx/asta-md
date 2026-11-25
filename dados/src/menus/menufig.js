async function menuSticker(prefix, botName = "MeuBot", userName = "Usuário", {
    header = `╭┈⊰ 🌸 『 *${botName}* 』\n┊Olá, #user#!\n╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    menuTopBorder = "╭┈",
    bottomBorder = "╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯",
    menuTitleIcon = "🍧ฺꕸ▸",
    menuItemIcon = "•.̇𖥨֗💜⭟",
    separatorIcon = "❁",
    middleBorder = "┊",
    createStickerMenuTitle = "🎨 CRIAÇÃO DE FIGURINHAS",
    managementMenuTitle = "⚙️ GERENCIAMENTO DE FIGURINHAS"
} = {}) {
    const formattedHeader = header.replace(/#user#/g, userName);
    return `${formattedHeader}

${menuTopBorder}${separatorIcon} *⚔️ NOVIDADES ASTA MD*
${middleBorder}
${middleBorder}${menuItemIcon}${prefix}s (vídeo/áudio = com som)
${middleBorder}${menuItemIcon}${prefix}s 0:15 10 (corta o trecho)
${middleBorder}${menuItemIcon}${prefix}sc (redonda)
${middleBorder}${menuItemIcon}${prefix}scorte (tira a tarja preta, com som)
${middleBorder}${menuItemIcon}${prefix}squadrado (corta em quadrado 1:1, com som)
${middleBorder}${menuItemIcon}${prefix}sfundo (tira o fundo de foto e vídeo)
${middleBorder}${menuItemIcon}${prefix}s em visualização única (foto/vídeo/áudio)
${middleBorder}${menuItemIcon}${prefix}revelar (abre visualização única)
${middleBorder}${menuItemIcon}${prefix}sl <texto> (com legenda)
${middleBorder}${menuItemIcon}${prefix}ssom <link/música>
${middleBorder}${menuItemIcon}${prefix}somfig (tira o som)
${middleBorder}${menuItemIcon}${prefix}tovideo (figurinha → vídeo)
${middleBorder}${menuItemIcon}${prefix}pack add / ver / nome
${bottomBorder}

${menuTopBorder}${separatorIcon} *${createStickerMenuTitle}*
${middleBorder}
${middleBorder}${menuItemIcon}${prefix}emojimix
${middleBorder}${menuItemIcon}${prefix}ttp
${middleBorder}${menuItemIcon}${prefix}attp
${middleBorder}${menuItemIcon}${prefix}sticker (áudio ou vídeo com som = figurinha com som 🔊 até 30s)
${middleBorder}${menuItemIcon}${prefix}sticker2
${middleBorder}${menuItemIcon}${prefix}s 0:15 10 (corta o trecho do vídeo)
${middleBorder}${menuItemIcon}${prefix}sc (figurinha redonda)
${middleBorder}${menuItemIcon}${prefix}scorte (corta a tarja preta do vídeo, mantém o som)
${middleBorder}${menuItemIcon}${prefix}ssom <link/música>
${middleBorder}${menuItemIcon}${prefix}somfig (tira o som da figurinha)
${middleBorder}${menuItemIcon}${prefix}sbg
${middleBorder}${menuItemIcon}${prefix}sfundo
${middleBorder}${menuItemIcon}${prefix}qc
${bottomBorder}

${menuTopBorder}${separatorIcon} *${managementMenuTitle}*
${middleBorder}
${middleBorder}${menuItemIcon}${prefix}figualeatoria
${middleBorder}${menuItemIcon}${prefix}figurinhas
${middleBorder}${menuItemIcon}${prefix}rename
${middleBorder}${menuItemIcon}${prefix}rgtake
${middleBorder}${menuItemIcon}${prefix}take
${middleBorder}${menuItemIcon}${prefix}toimg
${middleBorder}${menuItemIcon}${prefix}brat
${middleBorder}${menuItemIcon}${prefix}bratvid
${bottomBorder}
`;
}
export default menuSticker;