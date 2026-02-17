export const copyTextToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text);
};

export const numberWithCommas = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
