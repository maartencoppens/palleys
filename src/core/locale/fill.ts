import { Fragment, createElement, type ReactNode } from "react";

const PLACEHOLDER = /\{(\w+)\}/g;

/** Fills in a text from the messages: fill("Binnen {time}", { time: "2 weken" }). */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(PLACEHOLDER, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** The same with elements, for a link or a live value inside a sentence. */
export function fillNodes(template: string, values: Record<string, ReactNode>): ReactNode {
  const parts = template.split(PLACEHOLDER);
  // split() with a group: every odd entry is a placeholder's name.
  return parts.map((part, index) => createElement(Fragment, { key: index }, index % 2 === 1 ? values[part] : part));
}
