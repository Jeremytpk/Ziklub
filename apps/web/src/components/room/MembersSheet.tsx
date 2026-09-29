import type { Member } from '@ziklub/core';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../Sheet';
import { ZuAvatar } from '../ZuAvatar';

interface Props {
  members: Member[];
  djUid: string | undefined;
  uid: string;
  isDj: boolean;
  onPassAux: (m: Member) => void;
  onEditLook: () => void;
  onClose: () => void;
}

export function MembersSheet({ members, djUid, uid, isDj, onPassAux, onEditLook, onClose }: Props) {
  const { t } = useTranslation();
  const sorted = [...members].sort((a, b) => (a.uid === djUid ? -1 : b.uid === djUid ? 1 : a.joinedAt - b.joinedAt));
  return (
    <Sheet title={t('room.members')} onClose={onClose}>
      <ul className="member-list">
        {sorted.map((m) => (
          <li key={m.uid}>
            <ZuAvatar look={m.look} size={52} crop="head" crown={m.uid === djUid} />
            <span className="member-name">
              {m.name}
              {m.uid === uid && <small> ({t('room.you')})</small>}
            </span>
            {isDj && m.uid !== uid && (
              <button type="button" className="btn btn-soft btn-small" onClick={() => onPassAux(m)}>
                {t('room.passAux')}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost" onClick={onEditLook}>
        {t('room.editLook')}
      </button>
    </Sheet>
  );
}
