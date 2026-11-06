/** 국회 자료의 `손솔의원 등 12인` 표기를 화면 표기인 `손솔 의원 등 12인`으로 맞춘다. */
export function formatProposerText(text: string | null | undefined) {
  return text?.replace(/([가-힣])의원/g, '$1 의원').replace(/의원\s*등\s*(\d+)\s*인/g, '의원 등 $1인');
}
