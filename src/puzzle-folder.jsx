import React, {useEffect, useRef, useState} from 'react';
import {GARDEN, answerWords, clueHint, nextPuzzle, openPuzzles, puzzleStage, puzzles, rightAnswer} from './puzzle-folder.js';
import {openedWords} from './folder-open.js';
import {dayLabel} from './dessert-recipe.js';
import {play} from './sounds.js';

// The puzzle folder on the study computer, a treasure hunt in three steps:
// find the clue somewhere in the house, read it, come back and type the
// answer. The step to do now is lit; the ones done are ticked. Hints asked
// for are kept with the computer's data (computer.hints). Once it is open, a
// folder that appeared because of it, still locked, is pointed to (`next`),
// with a way over to it (`onNext`).
export function PuzzleFolder({id = GARDEN, clue, solvedOn, hints = 0, onHide, onHint, onSolve, icon, next = null, nextIcon, onNext}) {
  const p = puzzles[id], stage = puzzleStage(clue, solvedOn);
  const [answer, setAnswer] = useState(''), [message, setMessage] = useState(''), [nowhere, setNowhere] = useState(false), [justOpened, setJustOpened] = useState(false);
  // Opened for the first time, the folder sends its clue off to hide, and says
  // nothing about where. Coming back to it later, a hint can be asked for: first
  // where to look, then which room.
  const [justHidden] = useState(() => stage === 'hide');
  useEffect(() => {if (stage === 'hide') setNowhere(!onHide());}, [stage]);
  const steps = [
    {label: '在家里找到线索卡', done: stage === 'found' || stage === 'open'},
    {label: '拆开，读一读上面的谜语', done: stage === 'open' || !!clue?.opened},
    {label: '回到这里，填上答案', done: stage === 'open'}
  ];
  const now = steps.findIndex(s => !s.done), {hint, room} = clueHint(clue);
  const submit = e => {
    e.preventDefault();
    if (rightAnswer(answer, id)) {play('found'); setMessage(''); setJustOpened(true); onSolve();}
    else setMessage(answer.trim() ? '还没对上，再看看线索卡。' : '先把答案填进去。');
  };
  return <>
    <div className="desk-app-title"><small>THE LITTLE LOCKED FOLDER</small><h2>{p.title}</h2><p>{stage === 'open' ? '这只文件夹已经打开了。' : '一只上了锁的小文件夹，钥匙是一张线索卡。'}</p></div>
    <div className={'puzzle-folder ' + stage}>
      {icon}
      <ol className="puzzle-steps" aria-label="解谜的三步">{steps.map((s, i) => <li key={i} className={s.done ? 'done' : i === now ? 'now' : ''}><span aria-hidden="true">{s.done ? '✓' : i + 1}</span>{s.label}</li>)}</ol>
      {stage === 'open' ? <div className="puzzle-inside">
        <h3>文件夹打开了</h3>
        <blockquote>{p.inside.map((line, i) => <React.Fragment key={i}>{i > 0 && <br/>}{line}</React.Fragment>)}</blockquote>
        {justOpened ? <p className="puzzle-when">{openedWords(id)}</p> : dayLabel(solvedOn) && <p className="puzzle-when">{dayLabel(solvedOn)}打开的</p>}
        {p.then && <p className="puzzle-next-step">{p.then}</p>}
        {next && <div className="puzzle-new" role="status">
          {nextIcon}
          <p>电脑里又多了一只上锁的小文件夹<b>「{puzzles[next].title}」</b></p>
          <button className="desk-primary" type="button" onClick={onNext}>去打开它</button>
        </div>}
      </div> : stage === 'found' ? <form onSubmit={submit}>
        <p>{clue?.opened ? `${clue.location === 'bag' ? '线索卡在背包里，随时可以再读一遍。' : ''}答案是${answerWords(id)}。` : `线索卡找到了，还没拆开：${clue?.location === 'bag' ? '在背包里，' : ''}拆开读一读。`}</p>
        <label>谜题答案<input value={answer} maxLength={30} autoComplete="off" placeholder="输入线索卡上谜语的答案" onChange={e => {setAnswer(e.target.value); setMessage('');}}/></label>
        <button className="desk-primary" type="submit">打开文件夹</button>
      </form> : <div className="puzzle-hint">
        {nowhere ? <p>家里能藏线索的抽屉、匣子、书封和编织篮都放满了。腾出一个空位，再打开这里。</p> : stage === 'hide' ? <p>正在把线索藏起来……</p> : <>
          <p className="puzzle-hidden">线索已经藏在家里了，去找找看。</p>
          {justHidden ? <p className="puzzle-then">找到它，拆开读一读，再回电脑上来。</p> : hints < 1 ? <button className="puzzle-more" onClick={() => onHint(1)}>要一点提示</button> : <>
            <p className="puzzle-where"><small>提示</small>{hint}</p>
            {room && (hints >= 2 ? <p className="puzzle-room">{room}</p> : <button className="puzzle-more" onClick={() => onHint(2)}>还是找不到？</button>)}
          </>}
        </>}
      </div>}
      {message && <p className="puzzle-message" role="status">{message}</p>}
    </div>
    <p className="desk-boundary">这是游戏谜锁，不是加密保险箱；这里不收真实密码，也不存私人日记。</p>
  </>;
}

// All the folders that have appeared so far. With more than one, a row of
// tabs picks which to look at, starting on the first one still locked.
// `clue(id)` is that folder's clue card; the rest is kept per folder.
export function PuzzleFolders({clue, solved = {}, hints = {}, onHide, onHint, onSolve, iconFor}) {
  const open = openPuzzles(solved);
  const [id, setId] = useState(() => open.find(i => !solved[i]) || open[0]);
  const top = useRef(null), next = nextPuzzle(id);
  // Going over to the new folder starts at its top, where the tabs are.
  const goNext = () => {setId(next); play('tap'); top.current?.scrollIntoView({block: 'start', behavior: 'smooth'});};
  return <>
    <div ref={top} className="puzzle-top" aria-hidden="true"/>
    {open.length > 1 && <div className="puzzle-tabs" role="tablist" aria-label="谜题文件夹">
      {open.map(i => <button key={i} type="button" role="tab" aria-selected={i === id} className={i === id ? 'active' : ''} onClick={() => setId(i)}>
        {iconFor?.(!!solved[i])}<span>{puzzles[i].title}</span>{solved[i] && <small>已打开</small>}
      </button>)}
    </div>}
    <PuzzleFolder key={id} id={id} clue={clue(id)} solvedOn={solved[id]} hints={hints[id] || 0}
      onHide={() => onHide(id)} onHint={n => onHint(id, n)} onSolve={() => onSolve(id)} icon={iconFor?.(!!solved[id])}
      next={next && open.includes(next) && !solved[next] ? next : null} nextIcon={iconFor?.(false)} onNext={goNext}/>
  </>;
}
