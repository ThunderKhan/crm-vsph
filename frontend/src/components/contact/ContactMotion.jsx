import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { selectionIndicator } from "./contactMotionUtils.js";

// The selection state and content update immediately; only the underline moves.
export function SlidingTabs({ className, label, options, value, onChange }) {
  const root = useRef(null), selected = useRef(null);
  const [position,setPosition] = useState(null);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame;
    function measure() {
      const next = selectionIndicator(node.getBoundingClientRect(), selected.current?.getBoundingClientRect());
      setPosition(prev => prev && next && prev.x===next.x && prev.y===next.y && prev.width===next.width ? prev : next);
    }
    const schedule = () => { cancelAnimationFrame(frame); frame=requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    for (const button of node.querySelectorAll("button")) observer.observe(button);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value,options.length]);
  return <div ref={root} className={"cw-tabs cw-sliding-tabs "+className} role="group" aria-label={label} data-measured={!!position}>
    {options.map(([id,text])=><button ref={id===value ? selected : null} type="button" key={id} aria-pressed={id===value} onClick={()=>onChange(id)}>{text}</button>)}
    {position && <span className="cw-sliding-indicator" aria-hidden="true" style={{width:position.width,transform:`translate(${position.x}px,${position.y}px)`}}/>}
  </div>;
}

export function CopyGlyph({ copied }) {
  return <span className="cw-copy-glyph" data-copied={copied} aria-hidden="true">
    <Copy size={16} className="cw-copy-original"/>
    <svg className="cw-copy-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" pathLength="1"/></svg>
  </span>;
}

export function SaveGlyph({ state }) {
  return <span className="cw-save-glyph" aria-hidden="true">
    {state==="pending" ? <span className="cw-saving-spinner"/> : state==="saved" ? <Check size={16} className="cw-save-check"/> : null}
  </span>;
}

// A timer is restarted on each successful copy, not on each render.
export function useCopyFeedback(value) {
  const [copied,setCopied] = useState(false), [error,setError] = useState(false);
  const timer=useRef(null), alive=useRef(true), attempt=useRef(0);
  useEffect(()=>{alive.current=true; return ()=>{alive.current=false;attempt.current++;clearTimeout(timer.current);};},[]);
  useEffect(()=>{attempt.current++;clearTimeout(timer.current);},[value]);
  async function copy() {
    const ticket=++attempt.current;
    try {
      await navigator.clipboard.writeText(String(value));
      if (!alive.current || ticket!==attempt.current) return false;
      clearTimeout(timer.current);setCopied(true);setError(false);
      timer.current=setTimeout(()=>{if(alive.current)setCopied(false);},1500);
      return true;
    } catch {
      if (alive.current && ticket===attempt.current) {clearTimeout(timer.current);setCopied(false);setError(true);}
      return false;
    }
  }
  return {copied,error,copy};
}
