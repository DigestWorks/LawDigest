import { describe, expect, it } from 'vitest';
import { billHeadline } from './billHeadline';

describe('billHeadline', () => {
  const name = '선거관리위원회법 일부개정법률안';

  it.each([
    [
      '선거관리위원장을 상임직으로 바꾸고 감사·인사검증을 강화해 선관위 내부 통제를 높이기 위한 법안',
      '선거관리위원장을 상임직으로 바꾸고 감사·인사검증을 강화해 선관위 내부 통제를 높이기 위한 법안',
    ],
    ['내부 관리 감독 강화를 위한 선거관리위원회법 일부개정법률안', '내부 관리 감독 강화를 위한 법안'],
    ['개표 절차 개선을 위한  선거관리위원회법 일부개정법률안.', '개표 절차 개선을 위한 법안'],
    ['위법명령 거부하기 위한 선거관리위원회법 일부개정법률안', '위법명령 거부하기 위한 법안'],
    ['선거관리위원회법 일부개정법률안。', name],
    ['   ', name],
    [null, name],
    ['개표 절차를 바꾸는 선거관리위원회법 일부개정법률안', '개표 절차를 바꾸는 선거관리위원회법 일부개정법률안'],
  ])('formats %s', (title, expected) => {
    expect(billHeadline(name, title)).toBe(expected);
  });

  it('replaces only the official name when it already contains 위한', () => {
    const official = '농어촌마을 주거환경 개선 및 리모델링 촉진을 위한 특별법 일부개정법률안';
    expect(billHeadline(official, `정비사업 관련 법률용어의 쉬운 우리말 정비를 위한 ${official}`)).toBe(
      '정비사업 관련 법률용어의 쉬운 우리말 정비를 위한 법안',
    );
  });
});
