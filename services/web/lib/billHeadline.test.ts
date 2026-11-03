import { describe, expect, it } from 'vitest';
import { billHeadline } from './billHeadline';

describe('billHeadline', () => {
  const name = '선거관리위원회법 일부개정법률안';

  it.each([
    ['내부 관리 감독 강화를 위한 선거관리위원회법 일부개정법률안', '내부 관리 감독 강화'],
    ['개표 절차 개선을 위한  선거관리위원회법 일부개정법률안.', '개표 절차 개선'],
    ['위법명령 거부하기 위한 선거관리위원회법 일부개정법률안', '위법명령 거부하기'],
    ['선거관리위원회법 일부개정법률안。', name],
    ['   ', name],
    [null, name],
    ['개표 절차를 바꾸는 선거관리위원회법 일부개정법률안', '개표 절차를 바꾸는 선거관리위원회법 일부개정법률안'],
  ])('formats %s', (title, expected) => {
    expect(billHeadline(name, title)).toBe(expected);
  });
});
