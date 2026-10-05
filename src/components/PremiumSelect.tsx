'use client';

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import styles from './PremiumSelect.module.css';

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  id?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
};

export default function PremiumSelect({ value, onValueChange, children, id, className = '', required, disabled, 'aria-label': label }: Props) {
  const uid = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const [portal, setPortal] = useState<Element | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [active, setActive] = useState(0);
  const search = useRef({ text: '', time: 0 });
  const options = Children.toArray(children).filter(isValidElement<{ value?: string; children: ReactNode; disabled?: boolean }>).map(child => ({ value: String(child.props.value ?? child.props.children), label: child.props.children, disabled: child.props.disabled }));
  const selected = options.find(option => option.value === value);
  const open = () => {
    if (disabled || !button.current) return;
    const rect = button.current.getBoundingClientRect();
    setPortal(button.current.closest('[role="dialog"]') ?? document.body);
    const below = window.innerHeight - rect.bottom - 12;
    const height = Math.min(280, Math.max(120, below > 160 ? below : rect.top - 12));
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: below > 160 ? rect.bottom + 8 : Math.max(8, rect.top - height - 8), width: Math.min(rect.width, window.innerWidth - 16), maxHeight: height });
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
  };
  const choose = (index: number) => {
    if (!options[index] || options[index].disabled) return;
    setInvalid(false);
    onValueChange(options[index].value);
    setPosition(null);
    button.current?.focus();
  };
  useEffect(() => {
    if (!position) return;
    const close = (event: Event) => {
      if (menu.current?.contains(event.target as Node) || button.current?.contains(event.target as Node)) return;
      setPosition(null);
    };
    const resize = () => setPosition(null);
    document.addEventListener('pointerdown', close);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', resize);
    };
  }, [position]);
  useEffect(() => {
    const list = menu.current;
    const option = list?.querySelector<HTMLElement>(`[id="${uid}-${active}"]`);
    if (!position || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [active, position, uid]);
  return <div className={`${styles.root} ${className}`}>
    {required && <select className={styles.native} tabIndex={-1} aria-hidden="true" value={value} required={required} disabled={disabled} onChange={event => onValueChange(event.target.value)} onInvalid={event => { event.preventDefault(); setInvalid(true); button.current?.focus(); }}>{children}</select>}
    <button ref={button} id={id} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={!!position} aria-controls={position ? `${uid}-list` : undefined} aria-activedescendant={position ? `${uid}-${active}` : undefined} aria-required={required} aria-invalid={invalid && !value || undefined} disabled={disabled} className={styles.control} onClick={() => position ? setPosition(null) : open()} onKeyDown={event => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        if (position && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
        setPosition(null); return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (!position) { open(); return; }
        if (event.key === 'Enter' || event.key === ' ') { choose(active); return; }
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        let next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : active + direction;
        while (next >= 0 && next < options.length && options[next].disabled) next += direction;
        if (next >= 0 && next < options.length) setActive(next);
      } else if (event.key.length === 1) {
        search.current.text = Date.now() - search.current.time > 600 ? event.key : search.current.text + event.key;
        search.current.time = Date.now();
        const index = options.findIndex(option => !option.disabled && (Array.isArray(option.label) ? option.label.join('') : String(option.label)).toLocaleLowerCase('bg').startsWith(search.current.text.toLocaleLowerCase('bg')));
        if (!position) open();
        if (index >= 0) setActive(index);
      }
    }}><span>{selected?.label ?? 'Изберете'}</span><ChevronDown size={18} aria-hidden="true" /></button>
    {invalid && !value && <p className={styles.error} role="alert">Моля, изберете свободен час.</p>}
    {position && portal && createPortal(<div ref={menu} id={`${uid}-list`} role="listbox" aria-label={label} className={styles.menu} style={position}>
      {options.map((option, index) => <div key={option.value} id={`${uid}-${index}`} role="option" aria-selected={value === option.value} aria-disabled={option.disabled} className={`${styles.option} ${active === index ? styles.active : ''}`} onPointerMove={() => !option.disabled && setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <Check size={16} aria-hidden="true" />}</div>)}
    </div>, portal)}
  </div>;
}
