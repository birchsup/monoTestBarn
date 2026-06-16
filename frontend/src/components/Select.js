import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Select.css';

// Themed dropdown that replaces the native <select>. A native select renders
// its option list through the OS, so it can't follow the dark theme — this one
// draws its own menu (in a body portal, so table/overflow never clips it).
//
// Props:
//   value      — currently selected value (compared loosely with option values)
//   onChange   — called with the picked option's value (not a DOM event)
//   options    — [{ value, label, disabled? }]
//   placeholder— shown when nothing matches `value`
//   size       — 'sm' for the compact variant
const sameValue = (a, b) => String(a) === String(b);

const nextEnabledIndex = (options, from, dir) => {
    const n = options.length;
    for (let step = 1; step <= n; step++) {
        const i = (from + dir * step + n * step) % n;
        if (!options[i].disabled) return i;
    }
    return from;
};

const Select = ({
    value,
    onChange,
    options,
    placeholder = 'Select…',
    className = '',
    size,
    ariaLabel,
    id,
    disabled = false,
    'data-test-id': dataTestId
}) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [menuStyle, setMenuStyle] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const activeRef = useRef(null);

    const selectedIndex = options.findIndex(o => sameValue(o.value, value));
    const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

    const updatePosition = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setMenuStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            minWidth: rect.width
        });
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setActiveIndex(-1);
    }, []);

    const openMenu = useCallback(() => {
        if (disabled) return;
        updatePosition();
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabledIndex(options, -1, 1));
        setOpen(true);
    }, [disabled, updatePosition, selectedIndex, options]);

    const pick = useCallback((opt) => {
        if (opt.disabled) return;
        close();
        triggerRef.current?.focus();
        onChange(opt.value);
    }, [close, onChange]);

    // Keep the menu pinned to the trigger while scrolling/resizing.
    useEffect(() => {
        if (!open) return;
        const handler = () => updatePosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [open, updatePosition]);

    // Close when clicking outside the trigger and menu.
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (menuRef.current?.contains(e.target)) return;
            close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open, close]);

    // Keep the highlighted option in view while arrow-keying.
    useEffect(() => {
        if (open) activeRef.current?.scrollIntoView({ block: 'nearest' });
    }, [open, activeIndex]);

    const onKeyDown = (e) => {
        if (disabled) return;
        if (!open) {
            if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                openMenu();
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(i => nextEnabledIndex(options, i, 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(i => nextEnabledIndex(options, i, -1));
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (activeIndex >= 0) pick(options[activeIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                close();
                break;
            case 'Tab':
                close();
                break;
            default:
                break;
        }
    };

    return (
        <>
            <button
                type="button"
                ref={triggerRef}
                id={id}
                disabled={disabled}
                className={`select select-trigger${size === 'sm' ? ' select-sm' : ''}${open ? ' select-open' : ''}${className ? ` ${className}` : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                data-test-id={dataTestId}
                onClick={() => (open ? close() : openMenu())}
                onKeyDown={onKeyDown}
            >
                <span className={`select-value${selected ? '' : ' select-placeholder'}`}>
                    {selected ? selected.label : placeholder}
                </span>
            </button>
            {open && menuStyle && createPortal(
                <ul
                    ref={menuRef}
                    className={`select-menu${size === 'sm' ? ' select-menu-sm' : ''}`}
                    style={menuStyle}
                    role="listbox"
                >
                    {options.map((opt, i) => {
                        const isSelected = sameValue(opt.value, value);
                        return (
                            <li
                                key={opt.value === '' ? `__placeholder_${i}` : opt.value}
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={opt.disabled || undefined}
                                ref={i === activeIndex ? activeRef : null}
                                className={`select-option${i === activeIndex ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}${opt.disabled ? ' is-disabled' : ''}`}
                                onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(opt)}
                            >
                                {opt.label}
                            </li>
                        );
                    })}
                </ul>,
                document.body
            )}
        </>
    );
};

export default Select;
