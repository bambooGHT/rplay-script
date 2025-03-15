export const formatVideoFilename = (title: string, date: string) => {
  if (date) date = `[${date.slice(0, 10)}]`;
  return `${date} ${title.replaceAll(":", ".")}.ts`.replace(/[/\\:?"<>|\*]/g, "");
};

export const formatFileSize = (size: number) => {
  const aMultiples = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  const bye = 1024;

  if (size < bye) return size + aMultiples[0];
  let i = 0;

  for (var l = 0; l < 8; l++) {
    if (size / Math.pow(bye, l) < 1) break;
    i = l;
  }

  return `${(size / Math.pow(bye, i)).toFixed(2)}${aMultiples[i]}`;
};