import { BillListItem } from '@/types';

export function filterUniqueBills(bills: BillListItem[] = []) {
  return bills.filter((bill, index, list) => {
    const billId = bill?.bill_info_dto?.bill_id;

    return Boolean(billId) && list.findIndex((item) => item?.bill_info_dto?.bill_id === billId) === index;
  });
}
