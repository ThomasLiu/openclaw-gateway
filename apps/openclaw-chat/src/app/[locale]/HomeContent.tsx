'use client';

import React, { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MainContent from "@/components/layout/MainContent";
import { RightSidebar } from "@/components/layout/RightSidebar";

function HomeContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <TopBar 
        onSidebarToggle={handleSidebarToggle} 
        isSidebarOpen={isSidebarOpen} 
      />
      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar
          isCollapsed={!isSidebarOpen}
        />
        <MainContent
          messages={[]}
          isRunning={false}
          models={[]}
        />
        <RightSidebar
          agentId={undefined}
        />
      </div>
    </div>
  );
}

export default HomeContent;