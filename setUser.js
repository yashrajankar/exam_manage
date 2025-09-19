// Script to set a test user in localStorage for testing purposes
(function() {
    const testUser = {
        "_id": 11672,
        "rollNo": "AIDSU24001",
        "name": "AASAWARI SUNIL CHAUDHARI",
        "section": "B1",
        "email": "aasawari.chaudhari@example.com",
        "phone": "9123456001"
    };

    // Only set the user if there isn't already one set
    if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(testUser));
        console.log('Test user set in localStorage');
    }
})();