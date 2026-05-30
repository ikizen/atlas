"use client";

import { FolderOpenIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDrivePicker } from "@/hooks/use-drive-picker";

interface DriveFolderPickerProps {
  onPicked: (driveId: string, driveName: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Standalone button that opens the Google Drive Folder Picker.
 * For inline use in non-menu contexts. In dropdown menus, use
 * useDrivePicker() directly on the DropdownMenuItem onClick.
 */
export function DriveFolderPicker({
  onPicked,
  disabled,
  children,
}: DriveFolderPickerProps) {
  const { openPicker, loading, error } = useDrivePicker(onPicked);

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={openPicker}
        disabled={disabled || loading}
        className="gap-1.5 text-xs"
      >
        {loading ? (
          <RefreshCwIcon className="size-3.5 animate-spin" />
        ) : (
          <FolderOpenIcon className="size-3.5" />
        )}
        {children ?? "Connect Drive folder"}
      </Button>
      {error && <p className="px-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
