import React from 'react';
import Skeleton from './Skeleton.jsx';

export default function VideoCardSkeleton({ count = 1 }) {
  const cards = Array.from({ length: count });

  const renderSingle = (_, idx) => (
    <div key={idx} className="flex flex-col gap-3 w-full">
      {/* 16:9 Thumbnail skeleton */}
      <Skeleton className="w-full aspect-video rounded-2xl" />

      {/* Info row */}
      <div className="flex gap-3 px-0.5">
        {/* Channel Avatar */}
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />

        {/* Text lines */}
        <div className="flex-1 flex flex-col gap-2 pt-0.5">
          <Skeleton className="w-11/12 h-4 rounded-md" />
          <Skeleton className="w-2/3 h-3.5 rounded-md" />
          <div className="flex items-center gap-2 mt-0.5">
            <Skeleton className="w-16 h-3 rounded-md" />
            <Skeleton className="w-12 h-3 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );

  if (count === 1) {
    return renderSingle(null, 0);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
      {cards.map(renderSingle)}
    </div>
  );
}
