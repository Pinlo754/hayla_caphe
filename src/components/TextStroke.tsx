'use client';

import React, { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  color: string;
  stroke: number;
};

export function TextStroke({ children, color, stroke }: Props) {
  const strokeWidth = `${stroke / 10}px`;

  return (
    <span
      style={{
        WebkitTextStroke: `${strokeWidth} ${color}`,
        paintOrder: 'stroke fill',
      }}
    >
      {children}
    </span>
  );
}
