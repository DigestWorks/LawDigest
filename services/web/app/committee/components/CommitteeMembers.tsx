'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Avatar } from '@heroui/avatar';
import { getPartyColor } from '@/constants/party';
import { buildHemicycle } from '@/app/explore/lib/hemicycle';
import { orderPartiesByBloc } from '@/app/explore/lib/seatingOrder';
import type { CommitteeMember } from '@/types';

const VIEW_W = 100;
const VIEW_H = 56;
const CENTER_X = VIEW_W / 2;
// 가장 큰 좌석 반지름(3.8)보다 여백을 둬 맨 아래 줄이 잘리지 않게 한다.
const CENTER_Y = VIEW_H - 4.5;
const OUTER_R = 46;
const NO_PARTY = '무소속';

// 서버와 브라우저의 삼각함수 결과가 마지막 자리에서 달라 hydration 불일치가 나므로 좌표를 반올림한다.
const round = (value: number) => Math.round(value * 1000) / 1000;

interface PartyGroup {
  name: string;
  color: string;
  members: CommitteeMember[];
}

/** 서버가 정당 규모순으로 정렬한 위원을 정당 묶음으로 나눈다. */
function groupByParty(members: CommitteeMember[]): PartyGroup[] {
  const groups = new Map<string, PartyGroup>();
  members.forEach((member) => {
    const name = member.party_name?.trim() || NO_PARTY;
    const group = groups.get(name) ?? { name, color: getPartyColor(member.party_name), members: [] };
    group.members.push(member);
    groups.set(name, group);
  });
  return [...groups.values()];
}

/** 위원 구성 — 위원회 좌석을 반원으로 그리고 정당별로 위원을 묶어 보여 준다. */
export default function CommitteeMembers({ members }: { members: CommitteeMember[] }) {
  const reduceMotion = useReducedMotion();
  const [activeParty, setActiveParty] = useState<string | null>(null);
  const groups = useMemo(() => groupByParty(members), [members]);
  // 좌석은 탐색 탭 의석도와 같은 규칙(1당 왼쪽, 2당 오른쪽, 나머지 가운데)으로 채운다.
  const seatParty = useMemo(
    () =>
      orderPartiesByBloc(
        groups.map((group) => ({ group, party_name: group.name, congressman_count: group.members.length })),
      ).flatMap(({ group }) => group.members.map(() => group)),
    [groups],
  );
  const { seats, rowGap } = useMemo(() => buildHemicycle(members.length), [members.length]);
  const seatR = round(Math.max(1.4, Math.min(3.8, OUTER_R * rowGap * 0.4)));

  if (members.length === 0) return null;

  return (
    <section aria-labelledby="committee-members" className="flex flex-col gap-6">
      <h2 id="committee-members" className="text-[20px] font-semibold text-primary-3 dark:text-gray-0.5">
        위원 <span className="tabular-nums">{members.length}</span>명
      </h2>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:gap-8">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block w-full max-w-[340px] shrink-0"
          role="img"
          aria-label={`위원 ${members.length}명의 정당 구성: ${groups
            .map((group) => `${group.name} ${group.members.length}명`)
            .join(', ')}`}>
          {seats.map((seat, index) => {
            const group = seatParty[index];
            const dimmed = activeParty !== null && group.name !== activeParty;
            return (
              <motion.circle
                key={`${seat.row}-${seat.theta}`}
                cx={round(CENTER_X + OUTER_R * seat.radius * Math.cos(seat.theta))}
                cy={round(CENTER_Y - OUTER_R * seat.radius * Math.sin(seat.theta))}
                r={seatR}
                fill={group.color}
                strokeWidth={0.5}
                className="stroke-transparent dark:stroke-white/40"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: dimmed ? 0.18 : 1, scale: 1 }}
                transition={{
                  opacity: { duration: 0.25, delay: reduceMotion || activeParty !== null ? 0 : index * 0.025 },
                  scale: { duration: 0.35, delay: reduceMotion ? 0 : index * 0.025, ease: [0.22, 1, 0.36, 1] },
                }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            );
          })}
        </svg>

        <ul className="flex w-full flex-wrap gap-x-4 gap-y-2 sm:w-auto sm:flex-col sm:pb-1">
          {groups.map((group) => (
            <li key={group.name}>
              <button
                type="button"
                aria-pressed={activeParty === group.name}
                onClick={() => setActiveParty((prev) => (prev === group.name ? null : group.name))}
                onMouseEnter={() => setActiveParty(group.name)}
                onMouseLeave={() => setActiveParty(null)}
                className="flex min-h-8 items-center gap-2 rounded-md text-left text-[14px] text-primary-3 outline-none focus-visible:ring-2 focus-visible:ring-primary-2 dark:text-gray-0.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full dark:ring-1 dark:ring-white/40"
                  style={{ background: group.color }}
                />
                <span className="break-keep">{group.name}</span>
                <span className="font-bold tabular-nums">{group.members.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.name} aria-label={`${group.name} 위원`}>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-gray-3 dark:text-gray-1">
              <span
                aria-hidden="true"
                className="size-2 rounded-full dark:ring-1 dark:ring-white/40"
                style={{ background: group.color }}
              />
              {group.name}
            </h3>
            <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-8">
              {group.members.map((member) => (
                <li key={member.congressman_id}>
                  <Link
                    href={`/congressman/${member.congressman_id}`}
                    className="flex flex-col items-center gap-1.5 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary-2">
                    <Avatar
                      showFallback
                      name={member.congressman_name}
                      getInitials={(name) => name.slice(0, 1)}
                      className="size-14 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-b"
                      style={{ ['--tw-ring-color' as string]: group.color }}
                      src={
                        member.congressman_image_url
                          ? `${process.env.NEXT_PUBLIC_IMAGE_URL}${member.congressman_image_url}`
                          : undefined
                      }
                    />
                    <span className="text-[13px] font-medium text-primary-3 dark:text-gray-0.5">
                      {member.congressman_name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
