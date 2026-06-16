import React from 'react';

const Pagination = ({ offset, total, pageSize, onOffsetChange }) => {
    const page = Math.floor(offset / pageSize) + 1;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="pagination" data-test-id="pagination">
            <button
                className="btn btn-secondary btn-sm"
                disabled={offset === 0}
                onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
            >
                Previous
            </button>
            <span className="pagination-info">
                Page {page} of {totalPages} ({total} total)
            </span>
            <button
                className="btn btn-secondary btn-sm"
                disabled={offset + pageSize >= total}
                onClick={() => onOffsetChange(offset + pageSize)}
            >
                Next
            </button>
        </div>
    );
};

export default Pagination;
