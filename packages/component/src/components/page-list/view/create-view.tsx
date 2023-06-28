import type { View } from '@affine/env/filter';
import { SaveIcon } from '@blocksuite/icons';
import { useState } from 'react';

import { Button, Input, Modal, ModalCloseButton, ModalWrapper } from '../../..';
import { FilterList } from '../filter';
import * as styles from './view-list.css';

type CreateViewProps = {
  title?: string;
  init: View;
  onConfirm: (view: View) => void;
};
export const EditViewModel = ({
  init,
  onConfirm,
  open,
  onClose,
}: {
  init: View;
  onConfirm: (view: View) => void;
  open: boolean;
  onClose: () => void;
}) => {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalWrapper
        width={560}
        style={{
          padding: '40px',
          background: 'var(--affine-background-primary-color)',
        }}
      >
        <ModalCloseButton
          top={12}
          right={12}
          onClick={onClose}
          hoverColor="var(--affine-icon-color)"
        />
        <EditView
          init={init}
          onCancel={onClose}
          onConfirm={view => {
            onConfirm(view);
            onClose();
          }}
        />
      </ModalWrapper>
    </Modal>
  );
};
export const EditView = ({
  title,
  init,
  onConfirm,
  onCancel,
}: CreateViewProps & { onCancel: () => void }) => {
  const [value, onChange] = useState<View>(init);

  return (
    <div>
      <div className={styles.saveTitle}>{title ?? 'Save As New View'}</div>
      <div
        style={{
          backgroundColor: 'var(--affine-hover-color)',
          borderRadius: 8,
          padding: 20,
          marginTop: 20,
        }}
      >
        <FilterList
          value={value.filterList}
          onChange={list => onChange({ ...value, filterList: list })}
        ></FilterList>
      </div>
      <div style={{ marginTop: 20 }}>
        <Input
          placeholder="Untitled View"
          value={value.name}
          onChange={text => onChange({ ...value, name: text })}
        />
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 40 }}
      >
        <Button className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          style={{ marginLeft: 20, borderRadius: '8px' }}
          type="primary"
          onClick={() => {
            if (value.name.trim().length > 0) {
              onConfirm(value);
            }
          }}
        >
          Create
        </Button>
      </div>
    </div>
  );
};
export const SaveViewButton = ({ init, onConfirm }: CreateViewProps) => {
  const [show, changeShow] = useState(false);
  return (
    <>
      <Button
        className={styles.saveButton}
        onClick={() => changeShow(true)}
        size="middle"
      >
        <div className={styles.saveButtonContainer}>
          <div className={styles.saveIcon}>
            <SaveIcon />
          </div>
          <div className={styles.saveText}>Save View</div>
        </div>
      </Button>
      <EditViewModel
        init={init}
        onConfirm={onConfirm}
        open={show}
        onClose={() => changeShow(false)}
      />
    </>
  );
};
