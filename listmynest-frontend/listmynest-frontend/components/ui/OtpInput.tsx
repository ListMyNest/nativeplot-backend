"use client";

import { OtpSixBoxes } from "../auth/OtpSixBoxes";

export type OtpInputProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

/** Six-box OTP entry — see `OtpSixBoxes`. */
export function OtpInput(props: OtpInputProps) {
  return <OtpSixBoxes {...props} />;
}
