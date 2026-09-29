import { nextDj, type Member } from '@ziklub/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../Sheet';
import { ZuAvatar } from '../ZuAvatar';

interface Props {
  uid: string;
  isDj: boolean;
  isCreator: boolean;
  members: Member[];
  onLeave: (handTo?: Member) => void;
  onCloseRoom: () => void;
  onClose: () => void;
}

/** Shown to the DJ (and the room creator) when they leave: just leave, pass the aux first, or close the room. */
export function LeaveSheet({ uid, isDj, isCreator, members, onLeave, onCloseRoom, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'menu' | 'pick' | 'confirm'>('menu');
  const others = members.filter((m) => m.uid !== uid);
  const successor = members.find((m) => m.uid === nextDj(uid, members));

  return (
    <Sheet title={step === 'pick' ? t('room.pickDj') : t('room.leaveTitle')} onClose={onClose}>
      {step === 'menu' && (
        <div className="leave-options">
          <button type="button" className="leave-option" onClick={() => onLeave()}>
            <b>{t('room.leaveJust')}</b>
            <small>{isDj ? (successor ? t('room.leaveJustHint', { name: successor.name }) : t('room.leaveAloneHint')) : t('room.leave')}</small>
          </button>
          {isDj && others.length > 0 && (
            <button type="button" className="leave-option" onClick={() => setStep('pick')}>
              <b>{t('room.leavePass')}</b>
              <small>{t('room.leavePassHint')}</small>
            </button>
          )}
          {(isDj || isCreator) && (
            <button type="button" className="leave-option danger" onClick={() => setStep('confirm')}>
              <b>{t('room.closeRoom')}</b>
              <small>{t('room.closeRoomHint')}</small>
            </button>
          )}
        </div>
      )}

      {step === 'pick' && (
        <ul className="member-list">
          {others.map((m) => (
            <li key={m.uid}>
              <ZuAvatar look={m.look} size={48} crop="head" />
              <span className="member-name">{m.name}</span>
              <button type="button" className="btn btn-primary btn-small" onClick={() => onLeave(m)}>
                {t('room.passAux')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === 'confirm' && (
        <div className="confirm">
          <p>{t('room.closeSure')}</p>
          <button type="button" className="btn btn-danger btn-big" onClick={onCloseRoom}>
            {t('room.closeConfirm')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep('menu')}>
            {t('room.cancel')}
          </button>
        </div>
      )}
    </Sheet>
  );
}
