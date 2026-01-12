"use client";

import { useRef, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanReceipt } from "@/actions/transaction";

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);
  const hasShownToastRef = useRef(false);

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scannedData,
    error: scanError,
  } = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    // Reset the toast flag when starting a new scan
    hasShownToastRef.current = false;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    console.log("Starting receipt scan with file:", file.name);
    console.log("File type:", file.type);
    console.log("File size:", file.size, "bytes");
    
    try {
      await scanReceiptFn(file);
    } catch (error) {
      console.error("Error in handleReceiptScan:", error);
    }
  };

  // Handle successful scan
  useEffect(() => {
    if (scannedData && !scanReceiptLoading && !hasShownToastRef.current) {
      console.log("Received scanned data in component:", scannedData);
      
      if (scannedData.success && scannedData.data) {
        console.log("Passing data to parent:", scannedData.data);
        onScanComplete(scannedData.data);
        toast.success("Receipt scanned successfully!");
        hasShownToastRef.current = true;
      } else {
        console.error("Invalid scanned data structure:", scannedData);
        toast.error("Failed to extract data from receipt");
        hasShownToastRef.current = true;
      }
    }
  }, [scannedData, scanReceiptLoading, onScanComplete]);

  // Handle scan error
  useEffect(() => {
    if (scanError && !scanReceiptLoading && !hasShownToastRef.current) {
      console.error("Receipt scan error:", scanError);
      toast.error(scanError.message || "Failed to scan receipt. Please try again or enter manually.");
      hasShownToastRef.current = true;
    }
  }, [scanError, scanReceiptLoading]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleReceiptScan(file);
            // Reset input so same file can be selected again
            e.target.value = "";
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>
    </div>
  );
}