// scripts/convert-seating-to-classroom.js
// Script to convert existing seating plan data to classroom assignment format

const { pool } = require('../config/db');
const databaseService = require('../services/databaseService');

async function convertSeatingToClassroom() {
  try {
    console.log('Converting seating plans to classroom assignments...');
    
    // Get all seating plans
    const seatingPlans = await databaseService.getSeatingPlans();
    
    if (seatingPlans.length === 0) {
      console.log('No seating plans found to convert');
      return;
    }
    
    console.log(`Found ${seatingPlans.length} seating plans to convert`);
    
    // Get all students for reference
    const students = await databaseService.getStudents();
    const studentMap = {};
    students.forEach(student => {
      studentMap[student.rollNo] = student;
    });
    
    // Process each seating plan
    for (const plan of seatingPlans) {
      // Only process shuffled seating plans
      if (plan.examCode && plan.examCode.startsWith('SHUFFLE_')) {
        console.log(`Converting seating plan: ${plan.examCode}`);
        
        // Create classroom assignment record
        const assignmentId = plan.examCode;
        const assignmentName = `Classroom Assignment ${plan.examCode.replace('SHUFFLE_', '')}`;
        const assignmentDate = plan.examDate ? new Date(plan.examDate) : new Date();
        
        // Check if assignment already exists
        const existingAssignment = await databaseService.getClassroomAssignmentByAssignmentId(assignmentId);
        if (existingAssignment) {
          console.log(`Assignment ${assignmentId} already exists, skipping...`);
          continue;
        }
        
        // Count students and rooms in this plan
        let totalStudents = 0;
        let totalRooms = 0;
        
        if (plan.seats && Array.isArray(plan.seats)) {
          totalStudents = plan.seats.filter(seat => seat.rollNo && !seat.isTeacherDesk).length;
        }
        
        totalRooms = 1; // Each plan represents one room assignment
        
        // Create classroom assignment
        const assignment = {
          assignmentId,
          assignmentName,
          assignmentDate,
          totalStudents,
          totalRooms,
          generatedBy: 'System (Converted from Seating Plan)',
          isActive: true
        };
        
        try {
          await databaseService.createClassroomAssignment(assignment);
          console.log(`Created classroom assignment: ${assignmentId}`);
        } catch (error) {
          console.error(`Failed to create classroom assignment ${assignmentId}:`, error.message);
          continue;
        }
        
        // Create assigned classroom records for each student
        const assignedClassrooms = [];
        
        if (plan.seats && Array.isArray(plan.seats)) {
          for (const seat of plan.seats) {
            // Skip teacher desks and seats without roll numbers
            if (seat.isTeacherDesk || !seat.rollNo) {
              continue;
            }
            
            // Find student by roll number
            const student = studentMap[seat.rollNo];
            if (!student) {
              console.warn(`Student with roll number ${seat.rollNo} not found`);
              continue;
            }
            
            const assignedClassroom = {
              assignmentId,
              roomId: plan.roomId || 0,
              roomNumber: plan.roomNumber || 'Unknown',
              building: plan.building || 'Unknown',
              studentId: student._id,
              rollNo: seat.rollNo,
              studentName: student.name,
              assignedBy: 'System (Converted from Seating Plan)'
            };
            
            assignedClassrooms.push(assignedClassroom);
          }
        }
        
        // Bulk insert assigned classrooms
        if (assignedClassrooms.length > 0) {
          try {
            const results = await databaseService.createAssignedClassrooms(assignedClassrooms);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            console.log(`Created ${successCount} assigned classrooms for ${assignmentId} (${failCount} failed)`);
          } catch (error) {
            console.error(`Failed to create assigned classrooms for ${assignmentId}:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Conversion completed successfully!');
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    console.error('Error code:', error.code);
  }
}

// Run if called directly
if (require.main === module) {
  convertSeatingToClassroom().then(() => {
    process.exit(0);
  });
}

module.exports = convertSeatingToClassroom;