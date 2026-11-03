'use client';

import { NotificationList } from './components';

export default function Notification() {
  return (
    <section className="lg:max-w-[840px] mx-auto">
      <h1 className="sr-only">알림</h1>
      <NotificationList />
    </section>
  );
}
