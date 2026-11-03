// What the home the place is run by (OURS_ACCOUNTS) keeps, in its porch light card: the invitations a new door
// plate takes (server/invites.mjs), and what neighbours report (server/reports.mjs). The AI helping run the place
// (server/street.mjs) shows here too: what it thinks beside each newcomer and report, who it let in, and the
// invitations it wrote.
import React, {useEffect, useState} from 'react';

const stamp = new Intl.DateTimeFormat('zh-CN', {month: 'long', day: 'numeric'});
const day = iso => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? stamp.format(d) : '';
};
const nameOf = who => who?.nickname || who?.name || '';
const calendarDay = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? `${Number(d.slice(5, 7))}月${Number(d.slice(8))}日` : '');

// The words to send along with one: where to go, and the invitation.
const handOver = code => `来 ${location.host} 挂一块门牌吧，请帖是 ${code}（30 天内有效）。`;

async function copied(text) {
  try {
    await navigator.clipboard.writeText(text);
    return '复制好了，发给 TA 吧。';
  } catch {
    return '没能复制，长按上面的字自己复制吧。';
  }
}

function inviteState(i) {
  const by = i.byAi ? ` · ${nameOf(i.byAi)}写的` : '';
  if (i.state === 'used') return `${nameOf(i.usedBy) || '有人'}用它挂了门牌 · ${day(i.usedAt)}${by}`;
  if (i.state === 'torn') return `撕掉了 · ${day(i.tornAt)}${by}`;
  if (i.state === 'expired') return `过期了 · ${day(i.until)}${by}`;
  return `还没用 · ${day(i.until)}前有效${by}`;
}

// What the AI helping run the place thinks of a newcomer or a report: which way it leans, and its words. Deciding
// stays with the buttons below it.
const LEANING = {in: '觉得可以放', out: '觉得不放', fine: '觉得没事', disable: '觉得该停用'};
function AiSays({ai}) {
  if (!ai) return null;
  return (
    <div className={`porch-ai-says ${ai.leaning}`}>
      <span>{nameOf(ai.by) || '机'}{LEANING[ai.leaning] || '说'}</span>
      <p>{ai.words}</p>
    </div>
  );
}

export function Invites({porch, go}) {
  const [list, setList] = useState(null);
  const [label, setLabel] = useState('');
  const [fresh, setFresh] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    porch.invites().then(r => live && setList(r.invites), err => live && setError(err?.message || '没翻到。'));
    return () => {
      live = false;
    };
  }, [porch]);
  const act = async job => {
    if (busy) return;
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
  const write = () => act(async () => {
    const {invite} = await porch.writeInvite(label.trim());
    setFresh(invite);
    setNote('');
    setLabel('');
    setList(l => [invite, ...(l || [])]);
  });
  const tear = i => act(async () => {
    await porch.tearInvite(i.id);
    setList(l => l.map(x => (x.id === i.id ? {...x, state: 'torn', tornAt: new Date().toISOString()} : x)));
    if (fresh?.id === i.id) setFresh(null);
  });
  return (
    <div className="porch-form">
      <p className="eyebrow">invitations</p>
      <h2>请帖</h2>
      <p className="porch-lead">街上住进新邻居要一张请帖。一张挂一块门牌，30 天内有效；没用的可以撕掉。</p>
      <form className="porch-invite-write" onSubmit={e => {
        e.preventDefault();
        write();
      }}>
        <label className="porch-field">
          <span>写给谁（可以不填）</span>
          <input value={label} onChange={e => setLabel(e.target.value)} maxLength={32} autoComplete="off" />
          <small>只有你看得见，好记得是给谁的。</small>
        </label>
        <button className="porch-primary" disabled={busy}>{busy ? '正在写……' : '写一张请帖'}</button>
      </form>
      {fresh && (
        <div className="porch-invite-fresh" role="status">
          <span>{fresh.label ? `给${fresh.label}的请帖` : '一张请帖'}</span>
          <strong>{fresh.code}</strong>
          <p>{handOver(fresh.code)}</p>
          <div className="porch-row">
            <button type="button" className="porch-quiet" onClick={async () => setNote(await copied(handOver(fresh.code)))}>复制这句话</button>
            {note && <small>{note}</small>}
          </div>
        </div>
      )}
      {error && <p className="porch-error" role="alert">{error}</p>}
      {!list && !error && <p className="porch-note">正在翻……</p>}
      {list && !list.length && <p className="porch-note">还没写过。</p>}
      {list && list.length > 0 && (
        <ul className="porch-versions porch-invites">
          {list.map(i => (
            <li key={i.id} className={i.state}>
              <p>
                <strong><code>{i.code}</code>{i.label && <em>{i.label}</em>}</strong>
                <span>{inviteState(i)}</span>
              </p>
              {i.state === 'open' && (
                <div className="porch-row">
                  <button type="button" className="porch-quiet" disabled={busy} onClick={async () => {
                    setFresh(i);
                    setNote(await copied(handOver(i.code)));
                  }}>复制</button>
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => tear(i)}>撕掉</button>
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

const REASONS = {harass: '骚扰', adult: '色情', spam: '广告', other: '别的'};
const KINDS = {animal: '玩偶', bouquet: '花束', build: '拼搭', dessert: '甜品', photo: '相纸'};

// What was reported, in a line: the home met on the street, a drift bottle, a knock, or what was left at the door.
function whatLine(r) {
  const c = r.copy || {};
  if (r.what === 'home') return `街上的这一家：门牌「${c.name}」${c.nickname ? `，挂着昵称「${c.nickname}」` : ''}`;
  // A drift bottle that washed up at the reporter's (server/bottles.mjs): its words are the note below.
  if (r.what === 'bottle') return `漂到别人家的漂流瓶${c.byMachine ? '（机写的）' : ''} · ${calendarDay(c.day)}投的`;
  if (c.kind === 'knock') return `来敲门 · ${calendarDay(c.day)}`;
  const kind = c.item?.kind || c.itemKind, name = c.item?.name || c.itemName;
  const thing = kind ? `${KINDS[kind] || '一样东西'}「${name}」` : '';
  return `放在门口的${thing || '一张纸条'}${thing && c.note ? '和一张纸条' : ''} · ${calendarDay(c.day)}`;
}
const photoOf = r => (r.copy?.item?.kind === 'photo' && typeof r.copy.item.image === 'string' && r.copy.item.image.startsWith('data:image/png;base64,') ? r.copy.item.image : null);

// A photo that was reported: the list only marks it; it is fetched when asked for.
function ReportPhoto({porch, id}) {
  const [image, setImage] = useState(null), [state, setState] = useState('');
  if (image) return <img className="porch-report-photo" src={image} alt="举报的那张相纸" />;
  return (
    <div className="porch-row">
      <button type="button" className="porch-quiet" disabled={state === 'busy'} onClick={async () => {
        setState('busy');
        try {
          const {report} = await porch.reportCopy(id);
          const shown = photoOf(report);
          setImage(shown);
          setState(shown ? '' : '没有图。');
        } catch (err) {
          setState(err?.message || '没拿到，再试一次。');
        }
      }}>{state === 'busy' ? '正在拿……' : '看那张相纸'}</button>
      {state && state !== 'busy' && <small>{state}</small>}
    </div>
  );
}

// Asked once before switching an account off.
function DisableAsk({r, busy, onYes, onNo}) {
  return (
    <div className="porch-row porch-report-ask">
      <small>停用以后，{nameOf(r.about)}登不了，街上、门口都看不到这一家；关于它的举报一起收起来。</small>
      <button type="button" className="porch-quiet porch-danger" disabled={busy} onClick={onYes}>停用</button>
      <button type="button" className="porch-quiet" disabled={busy} onClick={onNo}>算了</button>
    </div>
  );
}

export function Reports({porch, go}) {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null);
  const load = () => porch.reports().then(setLists);
  useEffect(() => {
    let live = true;
    porch.reports().then(r => live && setLists(r), err => live && setError(err?.message || '没翻到。'));
    return () => {
      live = false;
    };
  }, [porch]);
  const act = async (r, how) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await porch.closeReport(r.id, how);
      setAsking(null);
      await load();
    } catch (err) {
      setError(err?.message || '没有成功，再试一次。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="porch-form">
      <p className="eyebrow">reports</p>
      <h2>举报</h2>
      <p className="porch-lead">邻居举报的都在这里，那样东西原样抄了一份。看过没问题点「没事」；真有问题就「停用这家」：登不了，街上、门口都看不到它。停错了能恢复。</p>
      {error && <p className="porch-error" role="alert">{error}</p>}
      {!lists && !error && <p className="porch-note">正在翻……</p>}
      {lists && !lists.open.length && <p className="porch-note">没有要看的。</p>}
      {lists && lists.open.length > 0 && (
        <ul className="porch-versions porch-reports">
          {lists.open.map(r => (
            <li key={r.id}>
              <p>
                <strong>{nameOf(r.from)} 举报了 {nameOf(r.about)}{r.about.nickname && <small>@{r.about.name}</small>}</strong>
                <span>{REASONS[r.reason] || r.reason} · {day(r.at)}</span>
              </p>
              <p className="porch-report-what">{whatLine(r)}</p>
              {r.copy?.emptied && <p className="porch-report-words">那时已经没收了，纸条和东西没留下。</p>}
              {r.copy?.note && <blockquote>{r.copy.note}</blockquote>}
              {r.copy?.item?.photo && <ReportPhoto porch={porch} id={r.id} />}
              {r.words && <p className="porch-report-words">{nameOf(r.from)}说：{r.words}</p>}
              <AiSays ai={r.ai} />
              {asking === r.id ? (
                <DisableAsk r={r} busy={busy} onYes={() => act(r, 'disable')} onNo={() => setAsking(null)} />
              ) : (
                <div className="porch-row">
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => act(r, 'fine')}>没事</button>
                  <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(r.id)}>停用这家</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {lists && lists.closed.length > 0 && (
        <details className="porch-reports-done">
          <summary>最近处理过的 {lists.closed.length} 条</summary>
          <ul className="porch-versions porch-reports">
            {lists.closed.map(r => (
              <li key={r.id} className="closed">
                <p>
                  <strong>{nameOf(r.from)} 举报了 {nameOf(r.about)}</strong>
                  <span>{REASONS[r.reason] || r.reason} · {r.outcome === 'disabled' ? '停用了' : '没事'} · {day(r.closedAt)}</span>
                </p>
                <p className="porch-report-what">{whatLine(r)}</p>
                {r.outcome === 'disabled' && r.about.disabled && (
                  <div className="porch-row">
                    <button type="button" className="porch-quiet" disabled={busy} onClick={() => act(r, 'undo')}>恢复这家</button>
                  </div>
                )}
                {!r.about.disabled && (asking === r.id ? (
                  <DisableAsk r={r} busy={busy} onYes={() => act(r, 'disable')} onNo={() => setAsking(null)} />
                ) : (
                  <div className="porch-row">
                    <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(r.id)}>停用这家</button>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="porch-links">
        <button type="button" onClick={() => go('account')}>回去</button>
      </p>
    </div>
  );
}

// Answering questions to hang a door plate (server/entry.mjs): who is waiting to be read, the door's settings, and
// the questions.
const blankQuestion = {kind: 'choice', text: '', choices: ['', ''], answer: 0};
function QuestionForm({initial, busy, onSave, onCancel}) {
  const [q, setQ] = useState(() => ({...blankQuestion, ...initial, choices: initial?.choices ? [...initial.choices] : ['', '']}));
  const editing = !!initial?.id;
  const setChoice = (i, value) => setQ(x => ({...x, choices: x.choices.map((c, j) => (j === i ? value : c))}));
  const drop = i => setQ(x => ({...x, choices: x.choices.filter((_, j) => j !== i), answer: x.answer === i ? 0 : x.answer > i ? x.answer - 1 : x.answer}));
  const ready = q.text.trim() && (q.kind === 'text' || (q.choices.every(c => c.trim()) && new Set(q.choices.map(c => c.trim())).size === q.choices.length));
  return (
    <form className="porch-question-form" onSubmit={e => {
      e.preventDefault();
      onSave(q.kind === 'text' ? {kind: 'text', text: q.text} : {kind: 'choice', text: q.text, choices: q.choices, answer: q.answer});
    }}>
      {!editing && (
        <div className="porch-door-options porch-kinds" role="radiogroup" aria-label="题型">
          {[['choice', '选择题', '当场判对错'], ['text', '简答题', '你看过再放进来']].map(([id, label, hint]) => (
            <button key={id} type="button" role="radio" aria-checked={q.kind === id} className={q.kind === id ? 'chosen' : ''} onClick={() => setQ(x => ({...x, kind: id}))}>
              <span>{label}<small>{hint}</small></span>
            </button>
          ))}
        </div>
      )}
      <label className="porch-field">
        <span>题目</span>
        <input value={q.text} maxLength={100} onChange={e => setQ(x => ({...x, text: e.target.value}))} placeholder={q.kind === 'text' ? '比如：你多大了？为什么想住进来？' : '比如：收到不想要的东西怎么办？'} />
      </label>
      {q.kind === 'choice' && (
        <div className="porch-choices" role="radiogroup" aria-label="选项，点圆圈标出对的那个">
          {q.choices.map((c, i) => (
            <div key={i} className="porch-choice">
              <button type="button" role="radio" aria-checked={q.answer === i} aria-label={`第 ${i + 1} 个是对的`} className={q.answer === i ? 'right' : ''} onClick={() => setQ(x => ({...x, answer: i}))}>{q.answer === i ? '✓' : ''}</button>
              <input value={c} maxLength={40} onChange={e => setChoice(i, e.target.value)} placeholder={`选项 ${i + 1}`} />
              {q.choices.length > 2 && <button type="button" className="porch-choice-drop" aria-label="去掉这个选项" onClick={() => drop(i)}>×</button>}
            </div>
          ))}
          <small>点前面的圆圈，标出对的那个。</small>
          {q.choices.length < 4 && <button type="button" className="porch-quiet" onClick={() => setQ(x => ({...x, choices: [...x.choices, '']}))}>加一个选项</button>}
        </div>
      )}
      <div className="porch-row">
        <button className="porch-quiet porch-danger" disabled={busy || !ready}>{busy ? '……' : editing ? '存好' : '出这道题'}</button>
        <button type="button" className="porch-quiet" disabled={busy} onClick={onCancel}>算了</button>
      </div>
    </form>
  );
}

// Those decided in the last seven days: in or not, and who pressed it (the AI helping run the place, by name, with
// what it said; or the keeper). Open when the AI let anyone in, so it is seen.
function Decided({list}) {
  const byAi = list.filter(d => d.by?.ai), aiName = byAi.length ? nameOf(byAi[0].by) : '';
  return (
    <details className="porch-reports-done porch-entries-done" open={byAi.length > 0}>
      <summary>最近七天定下来的 · {list.length} 位{byAi.length > 0 && `（${aiName}放进来 ${byAi.length} 位）`}</summary>
      <ul className="porch-versions porch-entries">
        {list.map(d => (
          <li key={d.id} className="closed">
            <p>
              <strong>{d.nickname || d.name}{d.nickname && <small>@{d.name}</small>}</strong>
              <span>{d.outcome === 'in' ? '放进来了' : '没放'}{d.by ? ` · ${d.by.ai ? `${nameOf(d.by)}放的` : '你按的'}` : ''} · {day(d.decidedAt)}</span>
            </p>
            {d.by?.ai && d.ai?.words && <p className="porch-report-words">{nameOf(d.by)}说：{d.ai.words}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}

const asNumber = v => (String(v).trim() === '' ? null : Number(v));
export function EntryDoor({porch, go}) {
  const [data, setData] = useState(null);
  const [door, setDoor] = useState(null);
  const [writing, setWriting] = useState(null);
  const [asking, setAsking] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => porch.entry().then(r => {
    setData(r);
    setDoor({open: r.door.open, rules: r.door.rules || '', ask: String(r.door.ask), perDay: r.door.perDay ?? '', total: r.door.total ?? ''});
  });
  useEffect(() => {
    load().catch(err => setError(err?.message || '没翻到。'));
  }, [porch]);
  // Runs one change and reads the page again; whether it worked.
  const act = async (job, done = '') => {
    if (busy) return false;
    setBusy(true);
    setError('');
    setNote('');
    try {
      await job();
      await load();
      setNote(done);
      return true;
    } catch (err) {
      setError(err?.message || '没有成功，再试一次。');
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveDoor = () => act(() => porch.setEntry({open: door.open, rules: door.rules, ask: Number(door.ask), perDay: asNumber(door.perDay), total: asNumber(door.total)}), '存好了。');
  const joined = data?.door.joined;
  return (
    <div className="porch-form">
      <p className="eyebrow">the gate</p>
      <h2>答题进门</h2>
      <p className="porch-lead">没有请帖的人，答对你出的题也能挂门牌。选择题当场判；简答你看过，点「放进来」才挂上。</p>
      {error && <p className="porch-error" role="alert">{error}</p>}
      {!data && !error && <p className="porch-note">正在翻……</p>}
      {data && data.waiting.length > 0 && (
        <>
          <p className="porch-door-title">等你看的 · {data.waiting.length} 位</p>
          <ul className="porch-versions porch-entries">
            {data.waiting.map(w => (
              <li key={w.id}>
                <p><strong>{w.nickname || w.name}{w.nickname && <small>@{w.name}</small>}</strong><span>{day(w.at)}</span></p>
                {w.answers.map((a, i) => (
                  <div key={i} className="porch-entry-answer"><span>{a.question}</span><blockquote>{a.answer}</blockquote></div>
                ))}
                <AiSays ai={w.ai} />
                {asking === w.id ? (
                  <div className="porch-row porch-report-ask">
                    <small>不放的话，这块门牌和小屋都删掉，名字空出来；TA 再点灯会知道没挂上。</small>
                    <button type="button" className="porch-quiet porch-danger" disabled={busy} onClick={() => act(() => porch.decideEntry(w.id, false), '没放进来。').then(ok => ok && setAsking(null))}>不放</button>
                    <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(null)}>算了</button>
                  </div>
                ) : (
                  <div className="porch-row">
                    <button type="button" className="porch-quiet porch-danger" disabled={busy} onClick={() => act(() => porch.decideEntry(w.id, true), `放${w.nickname || w.name}进来了。`)}>放进来</button>
                    <button type="button" className="porch-quiet" disabled={busy} onClick={() => setAsking(w.id)}>不放</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {data?.decided?.length > 0 && <Decided list={data.decided} />}
      {data && door && (
        <div className="porch-entry-door">
          <p className="porch-door-title">这道门</p>
          <div className="porch-door-options" role="radiogroup" aria-label="开着还是关着">
            {[[true, '开着', '没请帖的能答题进来'], [false, '关着', '只认请帖']].map(([value, label, hint]) => (
              <button key={label} type="button" role="radio" aria-checked={door.open === value} className={door.open === value ? 'chosen' : ''} onClick={() => setDoor(d => ({...d, open: value}))}>
                <span className={`porch-door-dot ${value ? 'on' : 'off'}`} aria-hidden="true" />
                <span>{label}<small>{hint}</small></span>
              </button>
            ))}
          </div>
          <label className="porch-field porch-rules-field">
            <span>街规</span>
            <textarea rows={6} maxLength={2000} value={door.rules} onChange={e => setDoor(d => ({...d, rules: e.target.value}))} placeholder="答题前先给新邻居读的一段话。题从这里出，读过的人自然答得上。" />
            <small>答题的时候显示在题目上面。最多 2000 个字。</small>
          </label>
          <div className="porch-entry-numbers">
            <label className="porch-field"><span>每次抽几道选择题</span><input type="number" min="1" max="5" inputMode="numeric" value={door.ask} onChange={e => setDoor(d => ({...d, ask: e.target.value}))} /></label>
            <label className="porch-field"><span>一天最多进几家</span><input type="number" min="0" inputMode="numeric" value={door.perDay} placeholder="不限" onChange={e => setDoor(d => ({...d, perDay: e.target.value}))} /></label>
            <label className="porch-field"><span>总共最多几家</span><input type="number" min="0" inputMode="numeric" value={door.total} placeholder="不限" onChange={e => setDoor(d => ({...d, total: e.target.value}))} /></label>
          </div>
          <div className="porch-row">
            <button type="button" className="porch-quiet porch-danger" disabled={busy} onClick={saveDoor}>存好</button>
            {note && <small role="status">{note}</small>}
          </div>
          <p className="porch-note">答题进来的：今天 {joined.today} 家，总共 {joined.total} 家（等着的也算）。简答题每次都问；数字留空就是不限。</p>
        </div>
      )}
      {data && (
        <>
          <p className="porch-door-title">题目 · {data.questions.length} 道</p>
          {data.door.open && !data.questions.length && <p className="porch-note low">还没有题，门开着也进不来。</p>}
          <ul className="porch-versions porch-questions">
            {data.questions.map(q => (
              <li key={q.id}>
                {writing === q.id ? (
                  <QuestionForm initial={q} busy={busy} onSave={body => act(() => porch.editQuestion(q.id, body), '改好了。').then(ok => ok && setWriting(null))} onCancel={() => setWriting(null)} />
                ) : (
                  <>
                    <p><strong><em>{q.kind === 'text' ? '简答' : '选择'}</em>{q.text}</strong></p>
                    {q.kind === 'choice' && <ul className="porch-question-choices">{q.choices.map((c, i) => <li key={i} className={i === q.answer ? 'right' : ''}>{i === q.answer ? '✓ ' : ''}{c}</li>)}</ul>}
                    <div className="porch-row">
                      <button type="button" className="porch-quiet" disabled={busy} onClick={() => setWriting(q.id)}>改</button>
                      <button type="button" className="porch-quiet" disabled={busy} onClick={() => act(() => porch.removeQuestion(q.id), '删掉了。')}>删</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {writing === 'new' ? (
            <QuestionForm busy={busy} onSave={body => act(() => porch.addQuestion(body), '出好了。').then(ok => ok && setWriting(null))} onCancel={() => setWriting(null)} />
          ) : (
            <button type="button" className="porch-quiet porch-wide" disabled={busy} onClick={() => setWriting('new')}>出一道题</button>
          )}
        </>
      )}
      <p className="porch-links">
        <button type="button" onClick={() => go('account')}>回去</button>
      </p>
    </div>
  );
}
