'use client';

/** Controlled input for voter display name on the public voting page. */

interface VoterNameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VoterNameInput({ value, onChange, disabled = false }: VoterNameInputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">Your Name</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="Enter your name"
        className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground focus:ring-2 focus:ring-lavender focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}
