import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySession } from '../../../lib/auth-utils';
import { validateObject } from '../../../lib/validation';

const getSupabase = () => createClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify authentication
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');
    const productionDate = searchParams.get('productionDate');

    console.log(`📥 GET request: lineId=${lineId}, productionDate=${productionDate}`);

    if (!lineId || !productionDate) {
      return NextResponse.json(
        { success: false, error: 'lineId and productionDate are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('first_pieces_approval_report')
      .select('*')
      .eq('line_id', lineId)
      .eq('production_date', productionDate)
      .order('entry_time', { ascending: true });

    if (error) {
      console.error('❌ Database error fetching first pieces approval:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch first pieces approval data' },
        { status: 500 }
      );
    }

    // Transform database data to frontend format
    const transformedData = data.map((entry: any) => {
      // Transform wall thickness data back to frontend format
      let frontendWallThicknessData = [];
      if (entry.wall_thickness_data && Array.isArray(entry.wall_thickness_data)) {
        frontendWallThicknessData = entry.wall_thickness_data.map((cavityData: any) => {
          const quadrants = cavityData.quadrants || {};
          return [
            {
              quadrant: 'X1',
              A: quadrants.X1?.top || 0,
              B: quadrants.X1?.bottom || 0,
              C: quadrants.X1?.middle || 0,
              D: quadrants.X1?.step_one || 0,
              E: quadrants.X1?.stack_area || 0,
              F: quadrants.X1?.base_bottom || 0,
              G: quadrants.X1?.bottom_radius || 0
            },
            {
              quadrant: 'X2',
              A: quadrants.X2?.top || 0,
              B: quadrants.X2?.bottom || 0,
              C: quadrants.X2?.middle || 0,
              D: quadrants.X2?.step_one || 0,
              E: quadrants.X2?.stack_area || 0,
              F: quadrants.X2?.base_bottom || 0,
              G: quadrants.X2?.bottom_radius || 0
            },
            {
              quadrant: 'Y1',
              A: quadrants.Y1?.top || 0,
              B: quadrants.Y1?.bottom || 0,
              C: quadrants.Y1?.middle || 0,
              D: quadrants.Y1?.step_one || 0,
              E: quadrants.Y1?.stack_area || 0,
              F: quadrants.Y1?.base_bottom || 0,
              G: quadrants.Y1?.bottom_radius || 0
            },
            {
              quadrant: 'Y2',
              A: quadrants.Y2?.top || 0,
              B: quadrants.Y2?.bottom || 0,
              C: quadrants.Y2?.middle || 0,
              D: quadrants.Y2?.step_one || 0,
              E: quadrants.Y2?.stack_area || 0,
              F: quadrants.Y2?.base_bottom || 0,
              G: quadrants.Y2?.bottom_radius || 0
            }
          ];
        });
      }

      return {
        id: entry.id,
        lineId: entry.line_id,
        moldName: entry.mold_name,
        entryDate: entry.entry_date,
        entryTime: entry.entry_time,
        lineNo: entry.line_no,
        materialGrade: entry.material_grade,
        materialPercentage: entry.material_percentage,
        productName: entry.product_name,
        color: entry.color,
        shift: entry.shift,
        noOfCavity: entry.no_of_cavity,
        mbGradePercentage: entry.mb_grade_percentage,
        cycleTime: entry.cycle_time,
        barrelTempNozzle: entry.barrel_temp_nozzle,
        cavityData: entry.cavity_data,
        wallThicknessData: frontendWallThicknessData,
        remarks: entry.remarks,
        isSubmitted: entry.is_submitted,
        submittedBy: entry.submitted_by,
        submittedAt: entry.submitted_at
      };
    });

    console.log(`📤 Returning ${transformedData?.length || 0} records for line ${lineId} on ${productionDate}`);
    return NextResponse.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('❌ Error in GET /api/first-pieces-approval:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify authentication
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('📥 POST request body:', body);

    // Validate and sanitize input
    const validatedData = validateObject(body, {
      lineId: {
        required: true,
        minLength: 1,
        maxLength: 50,
        type: 'string'
      },
      moldName: {
        required: true,
        minLength: 1,
        maxLength: 100,
        type: 'string'
      },
      productionDate: {
        required: true,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        type: 'string'
      },
      cavityData: {
        required: true,
        minLength: 1,
        maxLength: 50,
        type: 'string' // Will be validated as array separately
      },
      wallThicknessData: {
        required: true,
        minLength: 1,
        maxLength: 50,
        type: 'string' // Will be validated as array separately
      },
      barrelTemp: {
        required: false,
        min: 0,
        max: 1000,
        type: 'number'
      },
      processRemarks: {
        required: false,
        maxLength: 1000,
        type: 'string'
      },
      submittedBy: {
        required: true,
        minLength: 1,
        maxLength: 100,
        type: 'string'
      }
    });

    const {
      lineId,
      moldName,
      productionDate,
      cavityData,
      wallThicknessData,
      barrelTemp,
      processRemarks,
      submittedBy
    } = validatedData;

    // Validate arrays separately
    if (!Array.isArray(cavityData)) {
      return NextResponse.json(
        { success: false, error: 'cavityData must be an array' },
        { status: 400 }
      );
    }

    if (!Array.isArray(wallThicknessData)) {
      return NextResponse.json(
        { success: false, error: 'wallThicknessData must be an array' },
        { status: 400 }
      );
    }

    // Validate array sizes
    if (cavityData.length > 50) {
      return NextResponse.json(
        { success: false, error: 'cavityData cannot have more than 50 items' },
        { status: 400 }
      );
    }

    if (wallThicknessData.length > 50) {
      return NextResponse.json(
        { success: false, error: 'wallThicknessData cannot have more than 50 items' },
        { status: 400 }
      );
    }

    // Transform cavity data to match database structure
    const transformedCavityData = cavityData.map((cavity: any, index: number) => ({
      cavity_no: index + 1,
      surface_finish_visual: cavity.surfaceFinish || '',
      weight_gm: cavity.weight || 0,
      volume_ml: cavity.volume || 0,
      length_mm: cavity.lengthInnerDia || 0,
      breadth_mm: cavity.breadthOuterDia || 0,
      height_mm: cavity.height || 0,
      fitment: cavity.fitment || [],
      leakage_test_result: cavity.leakageTest || '',
      remarks: cavity.remarks || ''
    }));

    // Transform wall thickness data to match database structure
    const transformedWallThicknessData = wallThicknessData.map((cavityData: any, cavityIndex: number) => ({
      cavity_no: cavityIndex + 1,
      quadrants: {
        X1: {
          top: cavityData[0]?.A || 0,
          bottom: cavityData[0]?.B || 0,
          middle: cavityData[0]?.C || 0,
          step_one: cavityData[0]?.D || 0,
          stack_area: cavityData[0]?.E || 0,
          base_bottom: cavityData[0]?.F || 0,
          bottom_radius: cavityData[0]?.G || 0
        },
        X2: {
          top: cavityData[1]?.A || 0,
          bottom: cavityData[1]?.B || 0,
          middle: cavityData[1]?.C || 0,
          step_one: cavityData[1]?.D || 0,
          stack_area: cavityData[1]?.E || 0,
          base_bottom: cavityData[1]?.F || 0,
          bottom_radius: cavityData[1]?.G || 0
        },
        Y1: {
          top: cavityData[2]?.A || 0,
          bottom: cavityData[2]?.B || 0,
          middle: cavityData[2]?.C || 0,
          step_one: cavityData[2]?.D || 0,
          stack_area: cavityData[2]?.E || 0,
          base_bottom: cavityData[2]?.F || 0,
          bottom_radius: cavityData[2]?.G || 0
        },
        Y2: {
          top: cavityData[3]?.A || 0,
          bottom: cavityData[3]?.B || 0,
          middle: cavityData[3]?.C || 0,
          step_one: cavityData[3]?.D || 0,
          stack_area: cavityData[3]?.E || 0,
          base_bottom: cavityData[3]?.F || 0,
          bottom_radius: cavityData[3]?.G || 0
        }
      }
    }));

    console.log('📤 Inserting first pieces approval data:', {
      lineId,
      moldName,
      productionDate,
      cavityDataCount: cavityData.length,
      wallThicknessDataCount: wallThicknessData.length,
      submittedBy
    });

    const { data, error } = await supabase
      .from('first_pieces_approval_report')
      .insert({
        line_id: lineId,
        mold_name: moldName,
        entry_date: productionDate,
        production_date: productionDate,
        entry_time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        line_no: lineId,
        material_grade: null,
        material_percentage: 100.00,
        product_name: null,
        color: 'Black',
        shift: 'Day',
        no_of_cavity: cavityData.length,
        mb_grade_percentage: null,
        cycle_time: 4.00,
        barrel_temp_nozzle: Array(8).fill(barrelTemp || 200),
        cavity_data: transformedCavityData,
        wall_thickness_data: transformedWallThicknessData,
        remarks: processRemarks || '',
        is_submitted: true,
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ Database error inserting first pieces approval:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save first pieces approval data' },
        { status: 500 }
      );
    }

    console.log('✅ First pieces approval data saved successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in POST /api/first-pieces-approval:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
