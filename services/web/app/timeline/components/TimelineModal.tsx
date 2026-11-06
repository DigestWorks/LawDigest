import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';

export default function TimelineModal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="inside" className="min-h-[40%] max-h-[80%]">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody className="pb-6">{children}</ModalBody>
      </ModalContent>
    </Modal>
  );
}
