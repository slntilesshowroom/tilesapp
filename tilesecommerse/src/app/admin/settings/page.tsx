"use client";

import { useState } from "react";
import { HiCog, HiTruck, HiCreditCard, HiPhotograph } from "react-icons/hi";
import { SliderManagement } from "@/components/admin/SliderManagement";

type TabType = "general" | "shipping" | "payments" | "slider";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("slider");

  const tabs = [
    { id: "slider" as TabType, name: "Hero Slider", icon: HiPhotograph },
    { id: "general" as TabType, name: "General", icon: HiCog },
    { id: "shipping" as TabType, name: "Shipping", icon: HiTruck },
    { id: "payments" as TabType, name: "Payments", icon: HiCreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Configure your store settings</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "slider" && <SliderManagement />}

          {activeTab === "general" && (
            <div className="text-center py-12 text-slate-600">
              <HiCog className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">General Settings</h3>
              <p>Coming soon...</p>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="text-center py-12 text-slate-600">
              <HiTruck className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Shipping Settings</h3>
              <p>Coming soon...</p>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="text-center py-12 text-slate-600">
              <HiCreditCard className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Payment Settings</h3>
              <p>Coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
