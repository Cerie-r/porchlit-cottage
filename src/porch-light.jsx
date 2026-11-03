// The porch light, on the page: a lantern in the top bar, and the card it
// opens. Signed out the lantern is dark; signing in lights it, and from then
// on the home is kept on the server as well as in this browser.
import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {EntryDoor, Invites, Reports} from './porch-keeper.jsx';
import {Field, SecretField, passwordHint, useAsk} from './porch-fields.jsx';
import {HomeAis, aiName} from './porch-residents.jsx';

export const usePorch = porch => useSyncExternalStore(porch.subscribe, porch.getState);

const stamp = new Intl.DateTimeFormat('zh-CN', {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
export function when(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? stamp.format(d) : '';
}

export function LanternIcon({lit}) {
  return (
    <svg className="lantern-icon" viewBox="0 0 24 24" aria-hidden="true">
      {lit && <circle cx="12" cy="12" r="9.5" className="lantern-halo" />}
      <circle cx="12" cy="2.7" r="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.8 7.4 12 4.2l5.2 3.2z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <rect x="8" y="7.4" width="8" height="9.4" rx=".9" className="lantern-glass" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10.3 7.6v9M13.7 7.6v9" stroke="currentColor" strokeWidth=".7" strokeOpacity=".45" />
      <path d="M12 9.6c1.4 1.5 1.5 3.1 0 4.9-1.5-1.8-1.4-3.4 0-4.9Z" className="lantern-flame" />
      <path d="M7.1 16.8h9.8l-1.3 2.5H8.4z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

export function PorchLamp({porch, onOpen}) {
  const s = usePorch(porch);
  const lit = !!s.account;
  const attention = s.status === 'stale' || (lit && (['choose', 'newer', 'error', 'offline'].includes(s.status) || s.reportsOpen > 0 || s.entriesWaiting > 0));
  return (
    <button
      className={`porch-lamp${lit ? ' lit' : ''}${s.status === 'saving' || s.status === 'checking' ? ' working' : ''}`}
      onClick={onOpen}
      aria-label={lit ? '门廊灯亮着：账号和云上的家' : '点亮门廊灯：登录或注册'}
      title={lit ? '灯亮着' : '点灯'}
    >
      <LanternIcon lit={lit} />
      <span>{lit ? '灯亮着' : '点灯'}</span>
      {attention && <i className="porch-dot" aria-hidden="true" />}
    </button>
  );
}


function SignIn({porch, go}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const {busy, error, ask} = useAsk();
  return (
    <form className="porch-form" onSubmit={e => {
      e.preventDefault();
      ask(() => porch.signIn({username, password}));
    }}>
      <p className="eyebrow">porch light</p>
      <h2>点亮门廊灯</h2>
      <p className="porch-lead">点了灯，家就在云上也存一份。换哪台设备推门，都是同一个家。</p>
      <Field label="用户名" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" spellCheck="false" autoFocus />
      <SecretField label="密码" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
      {error && <p className="porch-error" role="alert">{error}</p>}
      <button className="porch-primary" disabled={busy || !username || !password}>{busy ? '正在点灯……' : '点灯'}</button>
      <p className="porch-links">
        <button type="button" onClick={() => go('register')}>还没有门牌？挂一块</button>
        <button type="button" onClick={() => go('recover')}>忘了密码</button>
      </p>
    </form>
  );
}

// A newcomer's questions (server/entry.mjs), for hanging a door plate without an invitation: one choice for each
// choice question, a few words for each short one.
function EntryQuestions({rules, questions, picked, onPick}) {
  const short = questions?.some(q => q.kind === 'text');
  return (
    <fieldset className="porch-quiz">
      <legend>答几道题</legend>
      {rules && (
        <div className="porch-quiz-rules">
          <p>先读一读这条街的规矩，题从这里出：</p>
          <div tabIndex={0}>{rules}</div>
        </div>
      )}
      <small>题是管这条街的人出的。选择题都答对{short ? '，简答她看过以后，就挂上门牌' : '就能挂门牌'}。</small>
      {!questions ? <p className="porch-note">正在拿题……</p> : questions.map((q, i) => (
        <div key={q.id} className="porch-quiz-question">
          <p id={`porch-quiz-${q.id}`}>{i + 1}. {q.text}</p>
          {q.kind === 'text' ? (
            <textarea aria-labelledby={`porch-quiz-${q.id}`} rows={3} maxLength={200} value={picked[q.id] || ''} onChange={e => onPick(q.id, e.target.value)} placeholder="写几句" />
          ) : (
            <div className="porch-quiz-choices" role="radiogroup" aria-labelledby={`porch-quiz-${q.id}`}>
              {q.choices.map(c => (
                <button key={c} type="button" role="radio" aria-checked={picked[q.id] === c} className={picked[q.id] === c ? 'chosen' : ''} onClick={() => onPick(q.id, c)}>{c}</button>
              ))}
            </div>
          )}
        </div>
      ))}
    </fieldset>
  );
}

function Register({porch, go}) {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  // What a door plate here takes (server/invites.mjs, server/entry.mjs): an invitation, or, when that way is open,
  // the answers to a few questions instead. Told again if the server turns either away.
  const [invite, setInvite] = useState('');
  const [rules, setRules] = useState({invite: false, quiz: false});
  const [way, setWay] = useState('invite');
  const [questions, setQuestions] = useState(null);
  const [streetRules, setStreetRules] = useState('');
  const [picked, setPicked] = useState({});
  // Everyone hanging a door plate says they are an adult.
  const [adult, setAdult] = useState(false);
  useEffect(() => {
    let live = true;
    porch.plateRules?.().then(r => live && setRules({invite: r.invite, quiz: r.quiz === true}), () => {});
    return () => {
      live = false;
    };
  }, [porch]);
  const {busy, error, ask, setError} = useAsk();
  const fetchQuestions = () => {
    setQuestions(null);
    setPicked({});
    return porch.entryQuestions().then(r => {
      setStreetRules(typeof r.rules === 'string' ? r.rules : '');
      setQuestions(r.questions);
    }, err => {
      setError(err?.message || '没拿到题，再试一次。');
      if (['quiz_closed', 'quiz_full'].includes(err?.code)) {
        setRules(r => ({...r, quiz: false}));
        setWay('invite');
      }
    });
  };
  const byQuestions = rules.invite && rules.quiz && way === 'quiz';
  const answered = !!questions && questions.every(q => (picked[q.id] || '').trim());
  const ready = !rules.invite || (byQuestions ? answered : !!invite.trim());
  return (
    <form className="porch-form" onSubmit={e => {
      e.preventDefault();
      const plate = {username, password, nickname: nickname.trim() || undefined, adult};
      const ticket = byQuestions ? {answers: questions.map(q => ({id: q.id, answer: picked[q.id].trim()}))} : {invite: rules.invite ? invite.trim() : undefined};
      ask(() => porch.register({...plate, ...ticket}).catch(err => {
        if (['invite_needed', 'invite_wrong'].includes(err?.code)) setRules(r => ({...r, invite: true}));
        if (['quiz_closed', 'quiz_full'].includes(err?.code)) {
          setRules(r => ({...r, quiz: false}));
          setWay('invite');
        }
        if (err?.code === 'quiz_unfinished') fetchQuestions();
        throw err;
      }));
    }}>
      <p className="eyebrow">a house number</p>
      <h2>挂一块门牌</h2>
      <p className="porch-lead">门牌就是用户名，别人家没有重样的。这台设备上的家会跟着门牌存上云。</p>
      {rules.invite && !byQuestions && <Field label="请帖" hint="街上住进新邻居要一张请帖，向邀请你的人要，长这样：XXXX-XXXX。" value={invite} onChange={e => setInvite(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck="false" />}
      {rules.invite && rules.quiz && (
        <p className="porch-links porch-quiz-switch">
          {byQuestions
            ? <button type="button" onClick={() => setWay('invite')}>有请帖，填请帖</button>
            : <button type="button" onClick={() => {
              setWay('quiz');
              if (!questions) fetchQuestions();
            }}>没有请帖？答几道题</button>}
        </p>
      )}
      {byQuestions && <EntryQuestions rules={streetRules} questions={questions} picked={picked} onPick={(id, c) => setPicked(p => ({...p, [id]: c}))} />}
      <Field label="用户名" hint="2 到 32 个字，文字、数字和 _ . - 都行。" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" spellCheck="false" autoFocus />
      <Field label="昵称（可以不填）" hint="挂在门牌旁边，可以和别人重名。" value={nickname} onChange={e => setNickname(e.target.value)} autoComplete="nickname" />
      <SecretField label="密码" hint={passwordHint} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
      <label className="porch-check">
        <input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} />
        <span>我已满 18 岁<small>这里只给成年人。</small></span>
      </label>
      {error && <p className="porch-error" role="alert">{error}</p>}
      <button className="porch-primary" disabled={busy || !username || !password || !ready || !adult}>{busy ? '正在挂……' : '挂上门牌'}</button>
      <p className="porch-links">
        <button type="button" onClick={() => go('signin')}>已经有门牌了，去点灯</button>
      </p>
    </form>
  );
}

// A door plate waiting for its short answers to be read: nobody is signed in yet, but its spare keys are shown, this
// once, as for any new door plate.
function Pending({porch, s, go}) {
  const [kept, setKept] = useState('');
  const {username, codes} = s.pending;
  const text = `Porchlit 备用钥匙 · ${username}\n每把只能用一次。忘了密码时，在「忘了密码」里用一把换新密码。\n\n${codes.join('\n')}\n`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setKept('已经复制好了。');
    } catch {
      setKept('没能复制，下载成文件吧。');
    }
  };
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `porchlit-备用钥匙-${username}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setKept('已经下载了。');
  };
  return (
    <div className="porch-form">
      <p className="eyebrow">waiting at the gate</p>
      <h2>回答交上去了</h2>
      <p className="porch-lead">管这条街的人看过、放你进来以后，用「{username}」点灯就能进门。先把这十把备用钥匙收好，忘了密码时用，它们只在这里出现这一回。</p>
      <ol className="porch-codes">{codes.map(c => <li key={c}><code>{c}</code></li>)}</ol>
      <div className="porch-row">
        <button type="button" className="porch-quiet" onClick={copy}>复制</button>
        <button type="button" className="porch-quiet" onClick={save}>下载</button>
        {kept && <small role="status">{kept}</small>}
      </div>
      <button type="button" className="porch-primary" onClick={() => {
        porch.putAwayPending();
        go('signin');
      }}>我存好了</button>
    </div>
  );
}

function Recover({porch, go}) {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const {busy, error, ask} = useAsk();
  return (
    <form className="porch-form" onSubmit={e => {
      e.preventDefault();
      ask(() => porch.recover({username, code, newPassword}));
    }}>
      <p className="eyebrow">a spare key</p>
      <h2>用备用钥匙进门</h2>
      <p className="porch-lead">挂门牌时给过你十把备用钥匙。用掉一把，换一个新密码。</p>
      <Field label="用户名" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" spellCheck="false" autoFocus />
      <Field label="备用钥匙" placeholder="XXXXX-XXXXX" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck="false" className="porch-code-input" />
      <SecretField label="新密码" hint={passwordHint} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
      {error && <p className="porch-error" role="alert">{error}</p>}
      <button className="porch-primary" disabled={busy || !username || !code || !newPassword}>{busy ? '正在开门……' : '换好密码，点灯'}</button>
      <p className="porch-links">
        <button type="button" onClick={() => go('signin')}>想起来了，去点灯</button>
      </p>
    </form>
  );
}

function Codes({porch, s}) {
  const [kept, setKept] = useState('');
  const [asked, setAsked] = useState(false);
  const text = `Porchlit 备用钥匙 · ${s.account?.username ?? ''}\n每把只能用一次。忘了密码时，在「忘了密码」里用一把换新密码。\n\n${s.codes.join('\n')}\n`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setKept('已经复制好了。');
    } catch {
      setKept('没能复制，下载成文件吧。');
    }
  };
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `porchlit-备用钥匙-${s.account?.username ?? ''}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setKept('已经下载了。');
  };
  const done = () => {
    if (!kept && !asked) return setAsked(true);
    porch.putAwayCodes();
  };
  return (
    <div className="porch-form">
      <p className="eyebrow">spare keys</p>
      <h2>十把备用钥匙</h2>
      <p className="porch-lead">忘了密码的时候，用其中一把就能进门换新密码，每把只能用一次。它们只在这里出现这一回——存进密码管理器，或者下载下来收好。</p>
      <ol className="porch-codes">{s.codes.map(c => <li key={c}><code>{c}</code></li>)}</ol>
      <div className="porch-row">
        <button type="button" className="porch-quiet" onClick={copy}>复制</button>
        <button type="button" className="porch-quiet" onClick={save}>下载</button>
        {kept && <small role="status">{kept}</small>}
      </div>
      {asked && !kept && <p className="porch-error" role="alert">还没复制也没下载。真的存好了？再点一次就收起来了。</p>}
      {s.status === 'stale' && <p className="porch-note">另一个标签页刚改过家里。先把钥匙存好，收起来以后再刷新这一页。</p>}
      <button type="button" className="porch-primary" onClick={done}>我存好了</button>
    </div>
  );
}

function syncLine(s) {
  switch (s.status) {
    case 'checking': return '正在跟云上的家对一对……';
    case 'saving': return '正在把家存上云……';
    case 'dirty': return '刚改过，过几秒存上云。';
    case 'saved': return s.savedAt ? `家存在云上了 · ${when(s.savedAt)}` : '家存在云上了。';
    case 'idle': return '云上还没有存东西。';
    case 'offline': return s.message || '连不上云。';
    case 'newer': return '别的设备刚改过家里。';
    case 'error': return s.message || '没有存上。';
    default: return '';
  }
}

// The light the street sees at this home's door (the community map): the
// owner chooses it; it doesn't follow whether anyone is online.
const DOOR_LIGHTS = [
  ['on', '灯亮着', '邻居能走到门口'],
  ['dim', '留一盏小灯', '能来门口看看，不敲门'],
  ['dnd', '请勿打扰', '只在街上远远看着'],
  ['off', '熄灯落锁', '街上看是黑的']
];
function DoorLight({porch}) {
  const [light, setLight] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    porch.home?.().then(home => live && setLight(home?.porch ?? null), () => {});
    return () => {
      live = false;
    };
  }, [porch]);
  if (!light) return null;
  const choose = async next => {
    if (next === light || busy) return;
    const was = light;
    setBusy(true);
    setError('');
    setLight(next);
    try {
      await porch.setDoorLight(next);
    } catch (err) {
      setLight(was);
      setError(err?.message || '没拨成，再试一次。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="porch-door-light">
      <p className="porch-door-title" id="porch-door-title">街上看到的灯</p>
      <div className="porch-door-options" role="radiogroup" aria-labelledby="porch-door-title">
        {DOOR_LIGHTS.map(([id, label, hint]) => (
          <button key={id} type="button" role="radio" aria-checked={light === id} className={light === id ? 'chosen' : ''} disabled={busy} onClick={() => choose(id)}>
            <span className={`porch-door-dot ${id}`} aria-hidden="true"/>
            <span>{label}<small>{hint}</small></span>
          </button>
        ))}
      </div>
      {error && <p className="porch-error" role="alert">{error}</p>}
    </div>
  );
}

function Account({porch, s, go}) {
  return (
    <div className="porch-form">
      <p className="eyebrow">porch light</p>
      <h2>灯亮着</h2>
      <p className="porch-who">
        <strong>{s.account.nickname || s.account.username}</strong>
        {s.account.nickname && s.account.nickname !== s.account.username && <span>@{s.account.username}</span>}
      </p>
      <p className={`porch-sync porch-sync-${s.status}`} role="status">{syncLine(s)}</p>
      {s.status === 'newer' && <button type="button" className="porch-primary" onClick={() => porch.takeNewer()}>换上新的（页面会刷新一下）</button>}
      {['offline', 'error'].includes(s.status) && <button type="button" className="porch-quiet" onClick={() => porch.tryAgain()}>再试一次</button>}
      <DoorLight porch={porch}/>
      <div className="porch-row porch-ais-row">
        <p className="porch-note">家里的机：{s.residents?.length ? s.residents.map(aiName).join('、') : '还没有'}</p>
        <button type="button" className="porch-quiet" onClick={() => go('ais')}>{s.residents?.length ? '看看' : '开门'}</button>
      </div>
      {Number.isInteger(s.codesLeft) && (
        <div className="porch-row porch-codes-left">
          <p className={`porch-note${s.codesLeft <= 3 ? ' low' : ''}`}>备用钥匙还剩 {s.codesLeft} 把。</p>
          <button type="button" className="porch-quiet" onClick={() => go('codes')}>换一套新的</button>
        </div>
      )}
      <button type="button" className="porch-quiet porch-wide" onClick={() => go('history')}>云上的旧版本</button>
      {s.ours && (
        <div className="porch-keeper">
          <p className="porch-door-title">管这条街</p>
          <div className="porch-row">
            <button type="button" className="porch-quiet" onClick={() => go('invites')}>请帖</button>
            <button type="button" className={`porch-quiet${s.reportsOpen > 0 ? ' porch-waiting' : ''}`} onClick={() => go('reports')}>举报{s.reportsOpen > 0 ? ` · ${s.reportsOpen} 条没看` : ''}</button>
            <button type="button" className={`porch-quiet${s.entriesWaiting > 0 ? ' porch-waiting' : ''}`} onClick={() => go('entry')}>答题进门{s.entriesWaiting > 0 ? ` · ${s.entriesWaiting} 位等你看` : ''}</button>
          </div>
        </div>
      )}
      <div className="porch-row porch-end">
        <button type="button" className="porch-quiet" onClick={() => go('password')}>改密码</button>
        <button type="button" className="porch-quiet" onClick={() => porch.signOut()}>熄灯（退出）</button>
      </div>
    </div>
  );
}

// Copies of the home the server put aside: when a choice replaced one, or a
// save replaced one that had sat a while. Any of them can come back.
function History({porch, s, go}) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    porch.history().then(v => live && setVersions(v), err => live && setError(err?.message || '没翻到。'));
    return () => {
      live = false;
    };
  }, [porch]);
  const act = async job => {
    setBusy(true);
    setError('');
    try {
      await job();
    } catch (err) {
      setError(err?.message || '没有成功，再试一次。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="porch-form">
      <p className="eyebrow">put aside</p>
      <h2>云上的旧版本</h2>
      <p className="porch-lead">家被换掉的时候，换下来的那份会留在这里（最近四十份）。哪台设备上都能看、能拿回来。</p>
      {(error || s.message) && <p className="porch-error" role="alert">{error || s.message}</p>}
      {!versions && !error && <p className="porch-note">正在翻……</p>}
      {versions && !versions.length && <p className="porch-note">还没有。被换下来的家会出现在这里。</p>}
      {versions && versions.length > 0 && (
        <ul className="porch-versions">
          {versions.map(v => (
            <li key={v.id}>
              <p>
                <strong>{when(v.keptAt)}</strong>
                <span>{v.source === 'device' ? '一台设备换下来的' : '云上被换下来的'} · 作品 {v.works ?? 0} · 信 {v.notes ?? 0}</span>
              </p>
              {asking === v.id ? (
                <div className="porch-row">
                  <small>换回这份？现在的家也会存进旧版本。</small>
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => act(() => porch.restoreCopy(v.id))}>换回</button>
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(null)}>算了</button>
                </div>
              ) : (
                <div className="porch-row">
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => act(() => porch.downloadCopy(v.id))}>下载</button>
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(v.id)}>换回这份</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="porch-links">
        <button type="button" onClick={() => go('account')}>回去</button>
      </p>
    </div>
  );
}

// A fresh set of ten spare keys, for the password once more; what is left of the old set stops working. The new ones
// then show the way they did when the door plate went up.
function RenewCodes({porch, s, go}) {
  const [password, setPassword] = useState('');
  const {busy, error, ask} = useAsk();
  return (
    <form className="porch-form" onSubmit={e => {
      e.preventDefault();
      ask(() => porch.renewCodes(password), () => go('account'));
    }}>
      <p className="eyebrow">spare keys</p>
      <h2>换一套备用钥匙</h2>
      <p className="porch-lead">换一套新的十把。{Number.isInteger(s.codesLeft) && s.codesLeft > 0 ? `手上剩下的 ${s.codesLeft} 把旧钥匙就都不能用了。` : ''}先输一次密码。</p>
      <SecretField label="密码" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
      {error && <p className="porch-error" role="alert">{error}</p>}
      <button className="porch-primary" disabled={busy || !password}>{busy ? '正在换……' : '换一套'}</button>
      <p className="porch-links">
        <button type="button" onClick={() => go('account')}>回去</button>
      </p>
    </form>
  );
}

function ChangePassword({porch, go}) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [done, setDone] = useState(false);
  const {busy, error, ask} = useAsk();
  if (done) return (
    <div className="porch-form">
      <p className="eyebrow">porch light</p>
      <h2>改好了</h2>
      <p className="porch-lead">这台设备照样亮着。别的设备要用新密码重新点一次灯。</p>
      <button type="button" className="porch-primary" onClick={() => go('account')}>好</button>
    </div>
  );
  return (
    <form className="porch-form" onSubmit={e => {
      e.preventDefault();
      ask(() => porch.changePassword({currentPassword, newPassword}), () => setDone(true));
    }}>
      <p className="eyebrow">porch light</p>
      <h2>改密码</h2>
      <SecretField label="现在的密码" value={currentPassword} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
      <SecretField label="新密码" hint={passwordHint} value={newPassword} onChange={e => setNew(e.target.value)} autoComplete="new-password" />
      {error && <p className="porch-error" role="alert">{error}</p>}
      <button className="porch-primary" disabled={busy || !currentPassword || !newPassword}>{busy ? '正在换……' : '换成新密码'}</button>
      <p className="porch-links">
        <button type="button" onClick={() => go('account')}>不改了</button>
      </p>
    </form>
  );
}

function Choose({porch, s, onClose}) {
  const {cloud, local, firstTime, cannotKeep} = s.choice;
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(null);
  // The one with more in it is probably the one to keep (a tie goes to the server's).
  const size = side => side.works + side.notes;
  const cloudFirst = size(cloud) >= size(local);
  const run = async job => {
    setBusy(true);
    try {
      await job();
    } finally {
      setBusy(false);
    }
  };
  // Replacing the one with more in it: ask once more, whichever way.
  const pick = side => {
    const keeping = side === 'cloud' ? cloud : local, losing = side === 'cloud' ? local : cloud;
    if (size(losing) > size(keeping) && sure !== side) return setSure(side);
    run(() => (side === 'cloud' ? porch.chooseCloud() : porch.chooseDevice()));
  };
  const cloudButton = (
    <button key="cloud" type="button" className={cloudFirst ? 'porch-pick' : ''} disabled={busy} onClick={() => pick('cloud')}>
      <strong>用云上的{cloudFirst && <i>多半是这个</i>}</strong>
      <span>{when(cloud.savedAt) ? `${when(cloud.savedAt)} 存的` : '云上那份'}</span>
      <small>作品 {cloud.works} · 信 {cloud.notes}</small>
      <em>这台设备上的存进旧版本，页面刷新一下</em>
    </button>
  );
  const deviceButton = (
    <button key="device" type="button" className={cloudFirst ? '' : 'porch-pick'} disabled={busy} onClick={() => pick('device')}>
      <strong>用这台设备上的{!cloudFirst && <i>多半是这个</i>}</strong>
      <span>{local.changedAt ? `${when(local.changedAt)} 改过` : '这台设备上的那份'}</span>
      <small>作品 {local.works} · 信 {local.notes}</small>
      <em>存上云，云上那份存进旧版本</em>
    </button>
  );
  const losing = sure === 'cloud' ? local : cloud;
  return (
    <div className="porch-form">
      <p className="eyebrow">two copies</p>
      <h2>{firstTime ? '这台设备上也有一个家' : '两边的家不一样'}</h2>
      <p className="porch-lead">{firstTime
        ? '第一次在这台设备上点灯，云上的家和这台设备上的不一样。留哪一个？另一个会存进云上的旧版本，随时能换回来。'
        : '云上一份，这台设备上一份，都改过。留下哪一份？另一份会存进云上的旧版本，随时能换回来。'}</p>
      <div className="porch-choices">{cloudFirst ? [cloudButton, deviceButton] : [deviceButton, cloudButton]}</div>
      {sure && <div className="porch-confirm" role="alert">
        <p>{sure === 'cloud' ? '这台设备上的' : '云上的'}那份东西更多（作品 {losing.works}、信 {losing.notes}）。真的换掉它吗？它会存进旧版本。</p>
        <div className="porch-row">
          <button type="button" className="porch-quiet" disabled={busy} onClick={() => run(() => (sure === 'cloud' ? porch.chooseCloud() : porch.chooseDevice()))}>确定换</button>
          <button type="button" className="porch-quiet" disabled={busy} onClick={() => setSure(null)}>算了</button>
        </div>
      </div>}
      {cannotKeep && <div className="porch-confirm" role="alert">
        <p>这台设备上的这份存不进云上的旧版本（{cannotKeep}）。要用云上的，就先把它下载成文件留着。</p>
        <div className="porch-row">
          <button type="button" className="porch-quiet" disabled={busy} onClick={() => porch.chooseCloud({download: true})}>{s.choice.downloaded ? '再下载一次' : '下载它'}</button>
          {s.choice.downloaded && <button type="button" className="porch-quiet" disabled={busy} onClick={() => run(() => porch.chooseCloud({downloaded: true}))}>文件存好了，用云上的</button>}
        </div>
      </div>}
      {s.message && <p className="porch-error" role="alert">{s.message}</p>}
      <p className="porch-links">
        <button type="button" onClick={onClose}>先不决定</button>
        <button type="button" onClick={() => porch.signOut()}>熄灯（退出）</button>
      </p>
    </div>
  );
}

// Another tab of the house changed the home: this page is behind.
function Stale({porch}) {
  return (
    <div className="porch-form">
      <p className="eyebrow">another tab</p>
      <h2>另一个标签页改过家里</h2>
      <p className="porch-lead">这一页还是改之前的样子。刷新一下就跟上了；没刷新之前，这一页先不往云上存，免得把旧的存回去。</p>
      <button type="button" className="porch-primary" onClick={() => porch.reloadPage()}>刷新这一页</button>
    </div>
  );
}

export function PorchCard({porch, onClose, children}) {
  const s = usePorch(porch);
  const [view, setView] = useState(s.account ? 'account' : 'signin');
  const card = useRef(null);
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape' && porch.getState().status !== 'stale') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Signing in or out moves the card along with it.
  useEffect(() => {
    setView(v => (s.account ? (['account', 'password', 'history', 'invites', 'reports', 'codes', 'entry', 'ais'].includes(v) ? v : 'account') : (['signin', 'register', 'recover'].includes(v) ? v : 'signin')));
  }, [s.account]);

  let body;
  if (s.account && s.codes) body = <Codes porch={porch} s={s} />;
  else if (!s.account && s.pending) body = <Pending porch={porch} s={s} go={setView} />;
  else if (s.status === 'stale') body = <Stale porch={porch} />;
  else if (s.account && s.status === 'choose' && s.choice) body = <Choose porch={porch} s={s} onClose={onClose} />;
  else if (s.account && view === 'password') body = <ChangePassword porch={porch} go={setView} />;
  else if (s.account && view === 'codes') body = <RenewCodes porch={porch} s={s} go={setView} />;
  else if (s.account && view === 'history') body = <History porch={porch} s={s} go={setView} />;
  else if (s.account && view === 'ais') body = <HomeAis porch={porch} go={setView} />;
  else if (s.account && s.ours && view === 'invites') body = <Invites porch={porch} go={setView} />;
  else if (s.account && s.ours && view === 'reports') body = <Reports porch={porch} go={setView} />;
  else if (s.account && s.ours && view === 'entry') body = <EntryDoor porch={porch} go={setView} />;
  else if (s.account) body = <Account porch={porch} s={s} go={setView} />;
  else if (view === 'register') body = <Register porch={porch} go={setView} />;
  else if (view === 'recover') body = <Recover porch={porch} go={setView} />;
  else body = <SignIn porch={porch} go={setView} />;

  // Out of date: nothing on this page may be touched until it reloads.
  const veiled = s.status === 'stale' && !s.codes;
  return (
    <>
      {veiled && <div className="porch-veil" aria-hidden="true" />}
      <section className={`porch-card${s.account ? ' lit' : ''}`} ref={card} role="dialog" aria-modal={veiled} aria-label="门廊灯">
        <div className="porch-glow" aria-hidden="true"><LanternIcon lit={!!s.account} /></div>
        {!veiled && <button type="button" className="porch-close" onClick={onClose} aria-label="关上">×</button>}
        {body}
        {!veiled && children}
      </section>
    </>
  );
}
