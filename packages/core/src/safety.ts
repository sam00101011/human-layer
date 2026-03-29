export const COMMENT_REPORT_REASONS = [
  "spam",
  "abuse_harassment",
  "hate_or_harm",
  "misleading",
  "scam",
  "privacy_doxxing",
  "other"
] as const;

export type CommentReportReasonCode = (typeof COMMENT_REPORT_REASONS)[number];

export type CommentReportReasonOption = {
  code: CommentReportReasonCode;
  label: string;
  description: string;
};

const COMMENT_REPORT_REASON_OPTIONS: readonly CommentReportReasonOption[] = [
  {
    code: "spam",
    label: "Spam",
    description: "Promotional, repetitive, or low-quality content."
  },
  {
    code: "abuse_harassment",
    label: "Abuse or harassment",
    description: "Bullying, threats, or targeted intimidation."
  },
  {
    code: "hate_or_harm",
    label: "Hate or harmful content",
    description: "Hateful, violent, or dangerous content."
  },
  {
    code: "misleading",
    label: "Misleading or dishonest",
    description: "Deceptive claims presented as reliable guidance."
  },
  {
    code: "scam",
    label: "Scam or fraud",
    description: "Phishing, impersonation, or financial abuse."
  },
  {
    code: "privacy_doxxing",
    label: "Privacy or doxxing",
    description: "Private personal information shared without consent."
  },
  {
    code: "other",
    label: "Other",
    description: "Something feels unsafe, but it does not fit a category above."
  }
] as const;

export function isCommentReportReasonCode(value: string): value is CommentReportReasonCode {
  return COMMENT_REPORT_REASONS.includes(value as CommentReportReasonCode);
}

export function getCommentReportReasonOptions(): readonly CommentReportReasonOption[] {
  return COMMENT_REPORT_REASON_OPTIONS;
}

export function getCommentReportReasonLabel(reasonCode: string): string {
  return (
    COMMENT_REPORT_REASON_OPTIONS.find((option) => option.code === reasonCode)?.label ??
    reasonCode.replace(/_/g, " ")
  );
}
