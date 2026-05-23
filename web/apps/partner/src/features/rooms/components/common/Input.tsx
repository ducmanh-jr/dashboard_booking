import React from "react";

export function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border rounded-md bg-background"
      />
    </div>
  );
}



