import {
  ACC_COLORS,
  BODY,
  BUILDER_TABS,
  HAIR_COLORS,
  LOOK_VALUES,
  METALS,
  type ColorPalette,
  type LookKey,
  type ZuLook,
} from '@ziklub/zu';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PALETTES: Record<ColorPalette, Record<string, string>> = {
  body: BODY,
  hair: Object.fromEntries(Object.entries(HAIR_COLORS).map(([k, v]) => [k, v[0]])),
  acc: Object.fromEntries(Object.entries(ACC_COLORS).map(([k, v]) => [k, v[0]])),
  metal: Object.fromEntries(Object.entries(METALS).map(([k, v]) => [k, v[0]])),
};

/** Tabs + options to dress up a Zu. The option lists come from @ziklub/zu so the Expo app can reuse them. */
export function ZuBuilder({ look, onChange }: { look: ZuLook; onChange: (l: ZuLook) => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(BUILDER_TABS[1].id);
  const current = BUILDER_TABS.find((x) => x.id === tab) ?? BUILDER_TABS[0];
  const set = (key: LookKey, value: string) => onChange({ ...look, [key]: value } as ZuLook);

  return (
    <div className="builder">
      <div className="tabs" role="tablist">
        {BUILDER_TABS.map((x) => (
          <button key={x.id} type="button" role="tab" className="tab" aria-selected={x.id === tab} onClick={() => setTab(x.id)}>
            {t(x.label)}
          </button>
        ))}
      </div>
      <div className="builder-panel" role="tabpanel">
        {current.groups
          .filter((g) => !g.when || g.when(look))
          .map((g) => (
            <div className="field" key={g.key}>
              <span className="field-label">{t(g.label)}</span>
              <div className="opts">
                {g.palette
                  ? Object.entries(PALETTES[g.palette]).map(([k, hex]) => (
                      <button
                        key={k}
                        type="button"
                        className="swatch"
                        style={{ background: hex }}
                        aria-label={t(`zu.color.${k}`)}
                        title={t(`zu.color.${k}`)}
                        aria-pressed={look[g.key] === k}
                        onClick={() => set(g.key, k)}
                      />
                    ))
                  : (g.values ?? LOOK_VALUES[g.key]).map((v) => (
                      <button key={v} type="button" className="chip" aria-pressed={look[g.key] === v} onClick={() => set(g.key, v)}>
                        {t(`zu.${g.key}.${v}`)}
                      </button>
                    ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
