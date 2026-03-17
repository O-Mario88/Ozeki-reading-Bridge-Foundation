"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    GEO_DISTRICT_BOUNDARIES,
    type GeoDistrictBoundary,
} from "@/lib/uganda-geojson-boundaries";
import type { UgandaMapSubRegionName } from "@/lib/uganda-map-taxonomy";

type DistrictSearchInputProps = {
    onSelectDistrict: (districtName: string, subRegion: UgandaMapSubRegionName) => void;
    placeholder?: string;
    className?: string;
};

export function DistrictSearchInput({
    onSelectDistrict,
    placeholder = "Search district\u2026",
    className,
}: DistrictSearchInputProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const matches = useMemo((): GeoDistrictBoundary[] => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        const startsWith: GeoDistrictBoundary[] = [];
        const contains: GeoDistrictBoundary[] = [];

        for (const d of GEO_DISTRICT_BOUNDARIES) {
            const name = d.name.toLowerCase();
            if (name.startsWith(q)) {
                startsWith.push(d);
            } else if (name.includes(q)) {
                contains.push(d);
            }
        }

        // Sort each group alphabetically, then combine
        startsWith.sort((a, b) => a.name.localeCompare(b.name));
        contains.sort((a, b) => a.name.localeCompare(b.name));
        return [...startsWith, ...contains].slice(0, 20);
    }, [query]);

    const handleSelect = useCallback(
        (district: GeoDistrictBoundary) => {
            setQuery(district.name);
            setOpen(false);
            setActiveIndex(-1);
            onSelectDistrict(district.name, district.subRegion);
        },
        [onSelectDistrict],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!open || matches.length === 0) {
                if (e.key === "ArrowDown" && matches.length > 0) {
                    setOpen(true);
                    setActiveIndex(0);
                    e.preventDefault();
                }
                return;
            }

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setActiveIndex((prev) => Math.min(prev + 1, matches.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setActiveIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (activeIndex >= 0 && activeIndex < matches.length) {
                        handleSelect(matches[activeIndex]!);
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    setOpen(false);
                    setActiveIndex(-1);
                    break;
            }
        },
        [open, matches, activeIndex, handleSelect],
    );

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
            item?.scrollIntoView({ block: "nearest" });
        }
    }, [activeIndex]);

    return (
        <div
            ref={wrapperRef}
            className={`impact-map-search-wrap ${className ?? ""}`.trim()}
        >
            <input
                ref={inputRef}
                type="text"
                className="impact-map-search-input"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(e.target.value.trim().length > 0);
                    setActiveIndex(-1);
                }}
                onFocus={() => {
                    if (query.trim().length > 0) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-controls="district-search-listbox"
                aria-label="Search district"
                autoComplete="off"
            />

            {open && (
                <ul
                    ref={listRef}
                    id="district-search-listbox"
                    className="impact-map-search-dropdown"
                    role="listbox"
                >
                    {matches.length === 0 ? (
                        <li className="impact-map-search-empty" role="option" aria-selected={false}>
                            No district found.
                        </li>
                    ) : (
                        matches.map((d, i) => (
                            <li
                                key={`${d.subRegion}-${d.name}`}
                                role="option"
                                aria-selected={i === activeIndex}
                                data-active={i === activeIndex ? "" : undefined}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur
                                    handleSelect(d);
                                }}
                            >
                                <span className="impact-map-search-district">{d.name}</span>
                                <span className="impact-map-search-subregion">{d.subRegion}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
