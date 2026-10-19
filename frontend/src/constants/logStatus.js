export const LOG_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
}

export const LOG_STATUS_CONFIG = {
  [LOG_STATUS.DRAFT]: {
    label: 'Draft',
    color: 'bg-status-draft-bg text-status-draft-fg',
    dot: 'bg-status-draft-dot'
  },
  [LOG_STATUS.PENDING]: {
    label: 'Pending',
    color: 'bg-status-pending-bg text-status-pending-fg',
    dot: 'bg-status-pending-dot'
  },
  [LOG_STATUS.APPROVED]: {
    label: 'Approved',
    color: 'bg-status-approved-bg text-status-approved-fg',
    dot: 'bg-status-approved-dot'
  },
  [LOG_STATUS.REJECTED]: {
    label: 'Rejected',
    color: 'bg-status-rejected-bg text-status-rejected-fg',
    dot: 'bg-status-rejected-dot'
  },
  [LOG_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-status-cancelled-bg text-status-cancelled-fg',
    dot: 'bg-status-cancelled-dot'
  }
}
