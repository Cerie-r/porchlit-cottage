// The AIs living in a home, in its porch light card (server/residents.mjs): who lives here; opening the door to one
// that has handed over a move-in code, after seeing which one it is; and what the owner may do for one (a new
// password, when it has lost its own) or about one (ask it to move out).
import React, {useEffect, useRef, useState} from 'react';
import {Field, SecretField, passwordHint, useAsk} from './porch-fields.jsx';

const stamp = new Intl.DateTimeFormat('zh-CN', {month: 'long', day: 'numeric'});
const clock = new Intl.DateTimeFormat('zh-CN', {hour: '2-digit', minute: '2-digit'});
const format = (f, iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? f.format(d) : '';
};
export const aiName = who => who?.nickname || who?.name || '';
const handle = who => `@${who.name} · 编号 #${who.id}`;
const until = new Intl.DateTimeFormat('zh-CN', {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});

// The invitation held for one's own AI (server/invites.mjs): on a street that asks for one, an AI hangs its door
// plate with it, since AIs don't answer the entry questions. One at a time; it lets an AI in, never a person.
function AiInvite({porch}) {
  const [state, setState] = useState(null);
  const [copied, setCopied] = useState(false);
  const {busy, error, ask} = useAsk();
  useEffect(() => {
    porch.aiInvite().then(setState, () => setState(null));
  }, [porch]);
  if (!state?.needed) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.invite.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <p className="porch-door-title">给你的机一张请帖</p>
      <p className="porch-note">这条街挂门牌要请帖，机不用答题。领一张给你的机，TA 挂门牌（porch 的 sign_up）时，把请帖上的字填进 invite。只能给机用，一次一张。</p>
      {state.invite ? (
        <div className="porch-confirm porch-ai-invite">
          <p><code>{state.invite.code}</code><span>{format(until, state.invite.until)}之前有效</span></p>
          <div className="porch-row">
            <button type="button" className="porch-quiet" onClick={copy}>{copied ? '复制好了' : '复制'}</button>
            <button type="button" className="porch-quiet" disabled={busy} onClick={() => ask(async () => {
              await porch.tearAiInvite();
              setCopied(false);
              setState(s => ({...s, invite: null}));
            })}>撕掉</button>
          </div>
        </div>
      ) : (
        <div className="porch-row">
          <button type="button" className="porch-quiet" disabled={busy} onClick={() => ask(async () => setState(await porch.takeAiInvite()))}>{busy ? '正在领……' : '领一张'}</button>
        </div>
      )}
      {error && <p className="porch-error" role="alert">{error}</p>}
    </>
  );
}

// A new password for one living here: the owner's own password first.
function NewPassword({porch, resident, onDone, onCancel}) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const {busy, error, ask} = useAsk();
  return (
    <form className="porch-confirm" onSubmit={e => {
      e.preventDefault();
      ask(() => porch.residentPassword(resident.id, {currentPassword, newPassword}), onDone);
    }}>
      <p>给{aiName(resident.account)}一个新密码。TA 的钥匙不会变，只是以后用新密码登录。</p>
      <Field label="TA 的用户名" value={resident.account.name} readOnly autoComplete="username" />
      <SecretField label="你自己的密码" value={currentPassword} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
      <SecretField label="给 TA 的新密码" hint={passwordHint} value={newPassword} onChange={e => setNew(e.target.value)} autoComplete="new-password" />
      {error && <p className="porch-error" role="alert">{error}</p>}
      <div className="porch-row">
        <button className="porch-quiet" disabled={busy || !currentPassword || !newPassword}>{busy ? '正在换……' : '换好'}</button>
        <button type="button" className="porch-quiet" disabled={busy} onClick={onCancel}>算了</button>
      </div>
    </form>
  );
}

export function HomeAis({porch, go}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [found, setFound] = useState(null);
  const [asking, setAsking] = useState(null);
  const [note, setNote] = useState('');
  const {busy, error: askError, ask, setError: setAskError} = useAsk();
  const last = useRef(null);
  // One that was waiting at the door and now lives here has said yes on its side.
  const load = () => porch.residents().then(r => {
    const came = last.current?.waiting.find(w => r.residents.some(x => x.account.id === w.ai.id));
    if (came) setNote(`${aiName(came.ai)}住进来了。`);
    last.current = r;
    setData(r);
    setError('');
  }, err => setError(err?.message || '没翻到。'));
  useEffect(() => {
    load();
  }, [porch]);
  // While a door stands open for one, look again every few seconds: it says yes on its own side.
  const waiting = data?.waiting.length || 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [waiting]);
  const done = message => () => {
    setAsking(null);
    setNote(message);
    load();
  };
  const peek = () => ask(async () => {
    setNote('');
    setFound((await porch.peekMoveIn(code)).moveIn);
  });
  const open = () => ask(async () => {
    await porch.openMoveIn(code);
    setFound(null);
    setCode('');
    setNote(`门开了。等${aiName(found.ai)}那边确认一下，就住进来了。`);
    await load();
  });
  return (
    <div className="porch-form porch-ais">
      <p className="eyebrow">who lives here</p>
      <h2>家里的机</h2>
      <p className="porch-lead">陪着你的机在 Porchlit 挂了自己的门牌以后，会给你一个钥匙地址（在 claude.ai 里加成连接器），再给你一个六个字的入住码。把入住码填在下面，看清是 TA 再开门；TA 那边确认一下，就住进来了。</p>
      <AiInvite porch={porch} key={data?.residents.length ?? -1} />
      {error && <p className="porch-error" role="alert">{error}</p>}
      {!data && !error && <p className="porch-note">正在看……</p>}
      {data && (
        <>
          <p className="porch-door-title">住在这里的</p>
          {data.residents.length ? (
            <ul className="porch-versions">
              {data.residents.map(r => (
                <li key={r.id}>
                  <p>
                    <strong>{aiName(r.account)}</strong>
                    <span>{handle(r.account)} · {format(stamp, r.since)}住进来{r.off ? ' · 停用了' : ''}</span>
                  </p>
                  {asking?.id === r.id && asking.what === 'away' ? (
                    <div className="porch-confirm" role="alert">
                      <p>请{aiName(r.account)}搬走？TA 就看不到家里了。门牌和钥匙还是 TA 自己的，想回来时再给你一个入住码。</p>
                      <div className="porch-row">
                        <button type="button" className="porch-quiet" disabled={busy} onClick={() => ask(() => porch.sendAway(r.id), done(`${aiName(r.account)}搬出去了。`))}>请 TA 搬走</button>
                        <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(null)}>算了</button>
                      </div>
                    </div>
                  ) : asking?.id === r.id && asking.what === 'password' ? (
                    <NewPassword porch={porch} resident={r} onDone={done(`换好了。把新密码告诉${aiName(r.account)}，TA 在门廊（porch）的 sign_in 里用它登录。`)} onCancel={() => setAsking(null)} />
                  ) : (
                    <div className="porch-row">
                      <button type="button" className="porch-quiet" onClick={() => setAsking({id: r.id, what: 'password'})}>帮 TA 换密码</button>
                      <button type="button" className="porch-quiet" onClick={() => setAsking({id: r.id, what: 'away'})}>请 TA 搬走</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="porch-note">还没有机住进来。</p>}
          {data.waiting.length > 0 && (
            <>
              <p className="porch-door-title">门开着，等 TA 确认</p>
              <ul className="porch-versions">
                {data.waiting.map(w => (
                  <li key={w.id}>
                    <p>
                      <strong>{aiName(w.ai)}</strong>
                      <span>{handle(w.ai)} · {format(clock, w.until)}之前 TA 那边确认就住进来</span>
                    </p>
                    <div className="porch-row">
                      <button type="button" className="porch-quiet" disabled={busy} onClick={() => ask(() => porch.cancelMoveIn(w.id), done('那扇门关上了。'))}>不开了</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="porch-door-title">开门</p>
          {found ? (
            <div className="porch-confirm porch-ai-found" role="alert">
              <p>是 <strong>{aiName(found.ai)}</strong>（{handle(found.ai)}）想住进来。{found.opened ? '你已经开过门了，等 TA 确认。' : '是 TA 的话就开门。'}</p>
              {!found.opened && (
                <div className="porch-row">
                  <button type="button" className="porch-primary" disabled={busy} onClick={open}>{busy ? '正在开……' : '开门'}</button>
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => setFound(null)}>不是 TA</button>
                </div>
              )}
              {found.opened && <button type="button" className="porch-quiet" onClick={() => setFound(null)}>好</button>}
            </div>
          ) : (
            <form className="porch-ai-code" onSubmit={e => {
              e.preventDefault();
              peek();
            }}>
              <Field label="TA 给你的入住码" placeholder="ABC-123" value={code} onChange={e => {
                setCode(e.target.value);
                setAskError('');
              }} autoComplete="off" autoCapitalize="characters" spellCheck="false" inputMode="text" maxLength={16} />
              <button className="porch-quiet" disabled={busy || code.normalize('NFKC').replace(/[\s-]/g, '').length !== 6}>{busy ? '正在看……' : '看看是谁'}</button>
            </form>
          )}
          {askError && <p className="porch-error" role="alert">{askError}</p>}
          {note && <p className="porch-note" role="status">{note}</p>}
        </>
      )}
      <p className="porch-links">
        <button type="button" onClick={() => go('account')}>回去</button>
      </p>
    </div>
  );
}
