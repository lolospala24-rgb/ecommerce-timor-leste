'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { User, Lock, Phone, Globe, Sun, Moon, Monitor, Mail, Package, BellRing, FileText, Shield, HelpCircle, LogOut, Check } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/stores/authStore';
import { ChangePasswordDialog } from '@/components/account/ChangePasswordDialog';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { SettingsGroup } from '@/components/account/SettingsGroup';
import { MenuRow } from '@/components/account/MenuRow';
import { SwitchRow } from '@/components/account/SwitchRow';
import { LogoutSheet } from '@/components/account/LogoutSheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import pkg from '../../../../../package.json';

const THEME_OPTIONS = [
  { value: 'light', label: 'Naroman', icon: Sun },
  { value: 'dark', label: 'Nakukun', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const { locale, setLocale, languages } = useTranslation();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { status: pushStatus, loading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } =
    usePushNotifications();

  const currentLanguage = languages.find((l) => l.code === locale);

  return (
    <div className="space-y-5">
      <AccountAppBar title="Konfigurasaun" backHref="/account" />

      <SettingsGroup label="Konta">
        <MenuRow icon={User} title="Informasaun pesoál" href="/account/profile" />
        <MenuRow icon={Lock} title="Troka password" onClick={() => setChangePasswordOpen(true)} />
        <MenuRow icon={Phone} title="Numeru telefone" value={user?.phone || '—'} href="/account/profile" />
      </SettingsGroup>

      <SettingsGroup label="Preferénsia">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Globe className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">Lian</span>
              <span className="text-sm text-muted-foreground">{currentLanguage?.nativeLabel}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languages.map((lang) => (
              <DropdownMenuItem key={lang.code} onClick={() => setLocale(lang.code)} className="gap-2">
                {lang.code === locale && <Check className="h-3.5 w-3.5" />}
                <span className={lang.code !== locale ? 'pl-[22px]' : ''}>{lang.nativeLabel}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
            <Sun className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-semibold text-foreground">Aparénsia</span>
          <div className="flex gap-1 rounded-full border bg-muted p-0.5">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                aria-label={opt.label}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                  theme === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                <opt.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup label="Notifikasaun">
        <MenuRow icon={Mail} title="Email order & konta" subtitle="Haruka automátiku ba konfirmasaun order, pagamentu, no seguransa konta — la bele hamriik." showChevron={false} />
        <MenuRow icon={Package} title="Alerta stock" subtitle="Jere husi butaun 'Fó hatene ha'u' iha pájina produtu ida-idak." showChevron={false} />
        {pushStatus !== 'unsupported' && (
          <SwitchRow
            title="Notifikasaun push"
            subtitle={
              pushStatus === 'denied'
                ? 'Bloqueia iha browser — ativa notifikasaun ba site ida-ne’e atu hili ida-ne’e.'
                : 'Simu notifikasaun iha aparelhu ida-ne’e ba atualizasaun order no promosaun foun.'
            }
            checked={pushStatus === 'subscribed'}
            disabled={pushLoading || pushStatus === 'denied'}
            onCheckedChange={(checked) => (checked ? subscribePush() : unsubscribePush())}
          />
        )}
      </SettingsGroup>

      <SettingsGroup label="Kona-ba">
        <MenuRow icon={FileText} title="Termu no kondisaun" href="/terms" />
        <MenuRow icon={Shield} title="Polítika privasidade" href="/privacy" />
        <MenuRow icon={HelpCircle} title="Ajuda & apoiu" href="/help" />
      </SettingsGroup>

      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
      >
        <LogOut className="h-4 w-4" />
        Sai husi konta
      </button>

      <p className="pb-2 text-center text-xs text-muted-foreground">Lolóspala versaun {pkg.version}</p>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <LogoutSheet open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
