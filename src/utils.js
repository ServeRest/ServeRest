function addZeroToLeft(number, wantedNumberOfCharacters) {
  while (number.toString().length < wantedNumberOfCharacters) {
    number = "0" + number;
  }
  return number;
}

export default function getHour() {
  const date = new Date();
  const hours = addZeroToLeft(date.getHours(), 2);
  const minutes = addZeroToLeft(date.getMinutes(), 2);
  const seconds = addZeroToLeft(date.getSeconds(), 2);
  const milliseconds = addZeroToLeft(date.getMilliseconds(), 3);
  return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
}
