# Student Data Import/Export Templates

This directory contains templates for importing and exporting student data in the AICN application.

## Available Templates

### CSV Format (Recommended)
- `student_template.csv` - Template for importing student data in CSV format
- `student_export_example.csv` - Example of exported student data in CSV format

### Tab-Delimited Format
- `student_template.txt` - Template for importing student data in tab-delimited format
- `student.csv` - Existing student data in tab-delimited format

## CSV Template Format

The CSV template contains the following columns:
1. **RollNo** - Unique student roll number (required)
2. **Name** - Student full name (required)
3. **Section** - Student section (B1, B2, or B3) (required)
4. **Email** - Student email address (optional)
5. **Phone** - Student phone number (optional)

## Import Instructions

1. Use either the CSV or tab-delimited template as a starting point
2. Replace the sample data with your actual student data
3. Ensure:
   - Roll numbers are unique
   - Names are properly formatted
   - Sections are one of: B1, B2, B3
   - Email addresses are valid (if provided)
   - Phone numbers are properly formatted (if provided)
4. Save the file
5. Use the "Import CSV" function in the Student Management section of the admin panel

## Export Information

When exporting student data from the system, the exported file will contain:
- All students in the database
- All fields including RollNo, Name, Section, Email, and Phone
- Data in CSV format with comma separation

## Field Requirements

- **RollNo**: Required, unique identifier
- **Name**: Required, full student name
- **Section**: Required, must be B1, B2, or B3
- **Email**: Optional, valid email format
- **Phone**: Optional, any format acceptable

## Example Data

```
RollNo,Name,Section,Email,Phone
STU001,John Doe,B1,john.doe@example.com,123-456-7890
STU002,Jane Smith,B2,jane.smith@example.com,098-765-4321
```