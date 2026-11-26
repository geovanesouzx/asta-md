import { renderMenu } from './_render.js';

export default async function menuMembros(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '👤 VOCÊ', i: [
        'meuperfil — seu cartão (título, cor, pet, casal)',
        'perfil — perfil de brincadeira',
        'meustatus',
        'registrar — registro (no privado)',
        'meuregistro',
        'afk <motivo> · voltei',
        'mention'
      ]
    },
    {
      t: 'ℹ️ BOT E GRUPO', i: [
        'ping · statusbot',
        'statusgp — informações do grupo',
        'regras',
        'resumo — o que rolou no grupo hoje',
        'resumir — resume a conversa',
        'agendados — mensagens agendadas',
        'aniversario — aniversários do grupo',
        'cargos — títulos por nível',
        'zipbot · gitbot'
      ]
    },
    {
      t: '🏆 RANKINGS', i: [
        'rankativo · rankinativo',
        'totalcmd · topcmd'
      ]
    },
    {
      t: '🎁 CONQUISTAS E PRESENTES', i: [
        'conquistas',
        'caixa diaria · caixa rara · caixa lendaria',
        'presente @user <tipo>',
        'inv'
      ]
    },
    {
      t: '⭐ REPUTAÇÃO', i: [
        'rep + @user · rep - @user',
        'rep @user · toprep',
        'denunciar @user <motivo>',
        'denuncias'
      ]
    },
    {
      t: '🎉 ROLÊS', i: [
        'roles',
        'role.vou · role.nvou',
        'role.confirmados'
      ]
    }
  ]);
}
