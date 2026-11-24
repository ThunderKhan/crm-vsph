import { useEffect, useRef, useState } from "react";
export function useDialogExit(onClose, enabled=true) {
  const [closing,setClosing]=useState(false);
  const lock=useRef(false), timer=useRef(null), callback=useRef(onClose);
  useEffect(()=>{callback.current=onClose;},[onClose]);
  useEffect(()=>()=>{clearTimeout(timer.current);lock.current=false;},[]);
  function close() {
    if(lock.current)return;
    if(!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches){onClose();return;}
    lock.current=true;setClosing(true);
    timer.current=setTimeout(()=>{callback.current();},180);
  }
  return {closing,close};
}
