import { useState } from "react";

export default function EmployeeMaster() {
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    designation: "",
    qualification: "",
    experience: "",
    joiningDate: "",
    email: "",
    mobile: "",
    status: "Active",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setEmployees([
      ...employees,
      {
        id: Date.now(),
        ...formData,
      },
    ]);

    setFormData({
      employeeId: "",
      employeeName: "",
      department: "",
      designation: "",
      qualification: "",
      experience: "",
      joiningDate: "",
      email: "",
      mobile: "",
      status: "Active",
    });
  };

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Employee Master</h2>

      {/* Employee Form */}
      <div className="card mb-4">
        <div className="card-header">
          <strong>Add Employee</strong>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">

              <div className="col-md-3">
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  className="form-control"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Employee Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option>Quality</option>
                  <option>Human Resource</option>
                  <option>Biomedical</option>
                  <option>Purchase</option>
                  <option>Maintenance</option>
                  <option>Information Technology</option>
                  <option>Microbiology</option>
                  <option>Biochemistry</option>
                  <option>Haematology</option>
                  <option>Molecular Biology</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  className="form-control"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Qualification</label>
                <input
                  type="text"
                  className="form-control"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Experience</label>
                <input
                  type="text"
                  className="form-control"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Joining Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Mobile</label>
                <input
                  type="text"
                  className="form-control"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="col-md-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Employee
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>

      {/* Employee Table */}
      <div className="card">
        <div className="card-header">
          <strong>Employee Records</strong>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Qualification</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">
                    No records found
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.employeeId}</td>
                    <td>{emp.employeeName}</td>
                    <td>{emp.department}</td>
                    <td>{emp.designation}</td>
                    <td>{emp.qualification}</td>
                    <td>{emp.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
