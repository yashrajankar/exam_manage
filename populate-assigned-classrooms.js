const path = require('path');
const DatabaseService = require('../services/databaseService');

// Set the path to the .env file in the parent directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function populateAssignedClassrooms() {
  try {
    console.log('Starting to populate assigned classrooms table...');
    
    // Get all seating plans
    const seatingPlans = await DatabaseService.getSeatingPlans();
    console.log(`Found ${seatingPlans.length} seating plans`);
    
    // Filter for shuffled plans (those with SHUFFLE_ in the examCode)
    const shuffledPlans = seatingPlans.filter(plan => 
      plan.examCode && plan.examCode.startsWith('SHUFFLE_')
    );
    
    console.log(`Found ${shuffledPlans.length} shuffled seating plans`);
    
    if (shuffledPlans.length === 0) {
      console.log('No shuffled seating plans found. Nothing to populate.');
      return;
    }
    
    // Create a classroom assignment record
    const assignmentId = `ASSIGNMENT_${new Date().toISOString().split('T')[0]}`;
    const assignmentName = `Classroom Assignment ${new Date().toISOString().split('T')[0]}`;
    
    // Get total students and rooms
    let totalStudents = 0;
    const roomIds = new Set();
    
    // Process each shuffled plan
    const assignedClassrooms = [];
    
    for (const plan of shuffledPlans) {
      // Extract students from seats
      if (plan.seats && Array.isArray(plan.seats)) {
        for (const seat of plan.seats) {
          if (seat.rollNo && !seat.isTeacherDesk) {
            // Get student info
            const student = await DatabaseService.getStudentByRollNo(seat.rollNo);
            
            assignedClassrooms.push({
              assignmentId: assignmentId,
              roomId: plan.roomId,
              roomNumber: plan.roomNumber,
              building: plan.building,
              studentId: student ? student._id : 0,
              rollNo: seat.rollNo,
              studentName: seat.name || seat.rollNo,
              assignedBy: 'System'
            });
            
            totalStudents++;
            roomIds.add(plan.roomId);
          }
        }
      }
    }
    
    // Create classroom assignment record
    const classroomAssignment = {
      assignmentId: assignmentId,
      assignmentName: assignmentName,
      assignmentDate: new Date(),
      totalStudents: totalStudents,
      totalRooms: roomIds.size,
      generatedBy: 'System',
      isActive: true
    };
    
    try {
      await DatabaseService.createClassroomAssignment(classroomAssignment);
      console.log('Created classroom assignment record');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Classroom assignment record already exists');
      } else {
        throw error;
      }
    }
    
    // Insert assigned classrooms
    let insertedCount = 0;
    for (const assignment of assignedClassrooms) {
      try {
        await DatabaseService.createAssignedClassroom(assignment);
        insertedCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`Assignment for student ${assignment.rollNo} already exists, skipping`);
        } else {
          console.error(`Error inserting assignment for student ${assignment.rollNo}:`, error.message);
        }
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} assigned classroom records`);
    console.log('Assigned classrooms population completed successfully');
    
  } catch (error) {
    console.error('Error populating assigned classrooms:', error);
    process.exit(1);
  }
}

// Run the function
populateAssignedClassrooms().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});