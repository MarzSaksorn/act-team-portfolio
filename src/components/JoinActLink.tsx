import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';

function safeInvite(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const isShort = url.hostname === 'discord.gg' && url.pathname.length > 1;
    const isLong = (url.hostname === 'discord.com' || url.hostname === 'www.discord.com') && url.pathname.startsWith('/invite/') && url.pathname.length > 8;
    return isShort || isLong ? url.toString() : null;
  } catch { return null; }
}
export default function JoinActLink() {
  const { text } = useLocale();
  const invite = safeInvite(import.meta.env.VITE_DISCORD_INVITE_URL);
  return invite ? <a className="button button-primary" href={invite} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" />{text.discord}<ArrowUpRight size={18} aria-hidden="true" /></a> : <span className="invite-pending"><MessageCircle size={18} aria-hidden="true" />{text.inviteSoon}</span>;
}
