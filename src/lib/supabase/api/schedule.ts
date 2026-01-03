import { getSupabase, handleSupabaseError } from '../utils';
import type { ScheduleJob } from '../types';
export const scheduleAPI = {
  // Get all schedule jobs
  async getAll(): Promise<ScheduleJob[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching schedule jobs:', error);
      throw error;
    }
    return data || [];
  },

  // Get schedule jobs by date
  async getByDate(date: string): Promise<ScheduleJob[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select('*')
      .eq('date', date)
      .order('start_time');
    
    if (error) {
      console.error('Error fetching schedule jobs by date:', error);
      throw error;
    }
    return data || [];
  },

  // Get schedule job by ID
  async getById(scheduleId: string): Promise<ScheduleJob | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schedule_jobs')
      .select('*')
      .eq('schedule_id', scheduleId)
      .single();
    
    if (error) {
      console.error('Error fetching schedule job:', error);
      return null;
    }
    return data;
  },

  // Create new schedule job
  async create(job: Omit<ScheduleJob, 'created_at' | 'updated_at'>): Promise<ScheduleJob | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schedule_jobs')
      .insert([job])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating schedule job:', error);
      throw error;
    }
    return data;
  },

  // Update schedule job
  async update(scheduleId: string, updates: Partial<ScheduleJob>): Promise<ScheduleJob | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schedule_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('schedule_id', scheduleId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating schedule job:', error);
      throw error;
    }
    return data;
  },

  // Delete schedule job
  async delete(scheduleId: string): Promise<boolean> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('schedule_jobs')
      .delete()
      .eq('schedule_id', scheduleId);
    
    if (error) {
      console.error('Error deleting schedule job:', error);
      throw error;
    }
    return true;
  },

  // Bulk create schedule jobs from Excel
  async bulkCreate(jobs: Omit<ScheduleJob, 'created_at' | 'updated_at'>[]): Promise<ScheduleJob[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('schedule_jobs')
      .insert(jobs)
      .select();
    
    if (error) {
      console.error('Error bulk creating schedule jobs:', error);
      throw error;
    }
    return data || [];
  },

  // Mark job as done
  async markDone(scheduleId: string, doneBy: string): Promise<ScheduleJob | null> {
    return this.update(scheduleId, {
      is_done: true,
      done_timestamp: new Date().toISOString(),
      created_by: doneBy
    });
  },

  // Approve job
  async approve(scheduleId: string, approvedBy: string): Promise<ScheduleJob | null> {
    return this.update(scheduleId, {
      approval_status: 'approved',
      approved_by: approvedBy
    });
  }
};
