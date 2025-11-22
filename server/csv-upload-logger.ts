import { storage } from "./storage.js";
import { type CsvUploadLog } from "@shared/schema";

export interface LogCsvUploadParams {
  businessId: number;
  fileName: string;
  rowsProcessed: number;
  rowsSkipped: number;
  totalRows: number;
  clientPreviews: string[];
  errors: string[];
  phoneStats?: {
    phonesFound: number;
    phonesMissing: number;
    coverage: number;
  };
}

/**
 * Logs a CSV upload with all relevant metadata
 */
export async function logCsvUpload(params: LogCsvUploadParams): Promise<void> {
  try {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const logEntry: CsvUploadLog = {
      id: uploadId,
      businessId: params.businessId,
      timestamp: new Date(),
      fileName: params.fileName,
      rowsProcessed: params.rowsProcessed,
      rowsSkipped: params.rowsSkipped,
      totalRows: params.totalRows,
      clientPreviews: params.clientPreviews.slice(0, 3), // Limit to first 3 names
      errors: params.errors.slice(0, 3), // Limit to first 3 errors
      phoneStats: params.phoneStats
    };

    // Store the individual upload log
    await storage.createCsvUploadLog(logEntry);

    console.log(`📊 CSV upload logged for business ${params.businessId}: ${params.fileName}`);
    console.log(`   Processed: ${params.rowsProcessed}, Skipped: ${params.rowsSkipped}, Total: ${params.totalRows}`);
    
  } catch (error) {
    console.error("Error logging CSV upload:", error);
    // Don't throw error to avoid breaking the main upload flow
  }
}

/**
 * Retrieves CSV upload history for a business
 */
export async function getCsvUploadHistory(businessId: number, limit: number = 10): Promise<CsvUploadLog[]> {
  try {
    const logs = await storage.getCsvUploadLogs(businessId, limit);
    // Cast JSON fields to proper types
    return logs.map(log => ({
      ...log,
      clientPreviews: Array.isArray(log.clientPreviews) ? log.clientPreviews as string[] : [],
      errors: Array.isArray(log.errors) ? log.errors as string[] : [],
      phoneStats: log.phoneStats as any
    }));
  } catch (error) {
    console.error("Error fetching CSV upload history:", error);
    return [];
  }
}