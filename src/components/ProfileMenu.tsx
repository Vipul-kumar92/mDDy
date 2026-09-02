import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, User as UserIcon, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { isSuperAdmin } from '../lib/firebase';
import Modal from './Modal';
import { AppError } from '../lib/types';

/** Header avatar + dropdown: profile info, edit name, change password, logout. */
export default function ProfileMenu() {
  const { user, logout, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const name = user.displayName || user.email || 'User';
  const initials = (user.displayName || user.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-soft transition hover:bg-slate-50"
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
          {user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-600 sm:inline">{name}</span>
        <ChevronDown size={15} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <div className="min-w-0">
              {user.displayName && <p className="truncate font-semibold text-slate-800">{user.displayName}</p>}
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => { setOpen(false); setEditing(true); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <UserIcon size={16} className="text-slate-400" /> Edit profile
            </button>
            <button
              onClick={() => { setOpen(false); setPwOpen(true); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <KeyRound size={16} className="text-slate-400" /> Change password
            </button>
            {isSuperAdmin() && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ShieldCheck size={16} className="text-slate-400" /> Admin panel
              </Link>
            )}
            <button
              onClick={() => void logout()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}

      <Modal open={editing} title="Edit profile" onClose={() => setEditing(false)}>
        <EditProfileForm
          initialName={user.displayName ?? ''}
          initialPhoto={user.photoURL ?? ''}
          onSave={async (displayName, photoURL) => {
            await updateProfile({ displayName, photoURL });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <Modal open={pwOpen} title="Change password" onClose={() => setPwOpen(false)}>
        <ChangePasswordForm onDone={() => setPwOpen(false)} />
      </Modal>
    </div>
  );
}

function EditProfileForm({
  initialName,
  initialPhoto,
  onSave,
  onCancel,
}: {
  initialName: string;
  initialPhoto: string;
  onSave: (displayName: string, photoURL: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState(initialPhoto);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
          await onSave(name.trim(), photo.trim());
        } catch {
          setError('Could not save profile.');
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-sm font-medium text-slate-700">Display name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Avatar image URL (optional)</label>
        <input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" className="input mt-1" />
        <p className="mt-1 text-xs text-slate-400">Paste an image link to use as your avatar.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setOk(false);
        setSaving(true);
        try {
          await changePassword(pw);
          setOk(true);
          setPw('');
          setTimeout(onDone, 800);
        } catch (err) {
          setError(err instanceof AppError ? err.message : 'Could not update password.');
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-sm font-medium text-slate-700">New password</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="At least 6 characters"
          className="input mt-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">Password updated.</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
