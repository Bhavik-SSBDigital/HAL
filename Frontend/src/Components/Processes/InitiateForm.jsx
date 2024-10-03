import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import React, { useEffect, useState } from "react";
import styles from "./InitiateForm.module.css";
import axios from "axios";
import CheckboxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckboxIcon from "@mui/icons-material/CheckBox";
import { IconCircle, IconCircleCheckFilled, IconCircleDotFilled, IconGradienter } from "@tabler/icons-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import InitiatProcess from "./InitiateProcess";
// import ComponentLoader from "../../common/Loader/ComponentLoader";

export default function InitiateForm() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState({});
  const [workFlow, setWorkFlow] = useState("");
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentSelection, setDepartmentSelection] = useState("");
  const headOfficeDepartments = branches?.find(
    (item) => item.name === "headOffice"
  )?.departments;
  const [processType, setProcessType] = useState();
  const [headofficeInclude, setHeadofficeInclude] = useState();
  const [managerDep, setManagerDep] = useState();
  const depBelongsToHeadoffice =
    departmentSelection.split("_")[0].toLowerCase() === "headoffice"
      ? true
      : false;

  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectAllCheckBranches, setSelectAllCheckBranches] = useState(false);
  const handleCommanBranchChange = (e, value) => {
    setSelectedBranches(value);
  };
  const handleSelectAllBranches = (e) => {
    if (e.target.checked) {
      const nonHeadOfficeBranches = branches
        ?.filter(
          (item) => item.name !== "headOffice" && item.departments.length > 0
        )
        ?.filter((item) => !departmentSelection.includes(item.name))
        .map((item) => item.name);
      setSelectedBranches(nonHeadOfficeBranches);
      setSelectAllCheckBranches(true);
    } else {
      setSelectedBranches([]);
      setSelectAllCheckBranches(false);
    }
  };

  // headoffice included
  const handleChangeManagerDep = (event, value) => {
    if (value) {
      setManagerDep(value.name);
    }
  };
  // --------------------------------------------------------
  // when department inside headoffice
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedHeadDepartments, setSelectedHeadDepartments] = useState([]);
  const [selectAllCheckDepartments, setSelectAllCheckDepartments] =
    useState(false);
  const [selectAllCheckHeadDepartments, setSelectAllCheckHeadDepartments] =
    useState(false);
  const handleDepartmentsSelect = (e, value) => {
    setSelectedDepartments(value);
  };
  const handleHeadDepartmentsSelect = (e, value) => {
    setSelectedHeadDepartments(value);
  };
  const handleSelectAllDepartments = (e) => {
    if (e.target.checked) {
      const allDeps = branches
        ?.filter(
          (item) =>
            !departmentSelection.includes(item.name) &&
            item.departments.length > 0
        )
        .map((item) => item.name);
      setSelectedDepartments(allDeps);
      setSelectAllCheckDepartments(true);
    } else {
      setSelectedDepartments([]);
      setSelectAllCheckDepartments(false);
    }
  };
  const handleSelectAllHeadDepartments = (e) => {
    if (e.target.checked) {
      const allDeps = headOfficeDepartments
        ?.filter((dep) => dep.name !== departmentSelection)
        ?.map((dep) => dep.name);
      setSelectedHeadDepartments(allDeps);
      setSelectAllCheckHeadDepartments(true);
    } else {
      setSelectedHeadDepartments([]);
      setSelectAllCheckHeadDepartments(false);
    }
  };
  // ----------------------------------------
  const fetchBranches = async () => {
    const url =
      backendUrl + "/getBranchesWithDepartments";
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setBranches(data.branches);
    } catch (error) {
      console.error("Error:", error);
    }
  };
  const getDepartments = async () => {
    const url =
      backendUrl + "/getDepartmentForInititors";
    axios
      .post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
        },
      })
      .then((response) => {
        if (response.status === 200) {
          setDepartments(response.data.departments);
        }
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        console.error("error", error);
      });
  };
  const handleProceed = (type) => {
    let workFlow = "",
      connectors = [],
      infoMessage;

    switch (type) {
      case "1":
        if (!departmentSelection) {
          infoMessage = "Select a department";
          break;
        }
        // find if of workFlow using name
        const workFlowId = departments.find(
          (item) => item.department === departmentSelection
        );
        workFlow = workFlowId?._id;
        break;

      case "2":
        // filter ids of departments from names
        const headDepsIDs = headOfficeDepartments
          ?.filter((dep) => selectedHeadDepartments.includes(dep.name))
          .map((dep) => dep._id);
        const normalDepIDs = branches
          ?.filter((branch) => selectedDepartments.includes(branch.name))
          ?.map((branch) => branch.departments.map((dep) => dep._id))
          .flat();
        const finalDepartments = [...headDepsIDs, ...normalDepIDs];
        if (!departmentSelection || finalDepartments.length === 0) {
          infoMessage = "Select department and provide inputs";
          break;
        }
        // find id of workFlow using name
        const workFlowId1 = departments.find(
          (item) => item.department === departmentSelection
        );
        workFlow = workFlowId1?._id;
        connectors = finalDepartments;
        break;

      case "3":
        if (!managerDep || !departmentSelection) {
          infoMessage = "Please select department";
          break;
        }
        // find id of headoffice department using its name
        const managerDepId = headOfficeDepartments?.find(
          (dep) => dep.name === managerDep
        );
        // find connector id using name from selectedDepartment array
        workFlow = managerDepId?._id;
        connectors = [selectedDepartment?._id];
        break;

      default:
        if (!departmentSelection || selectedBranches.length === 0) {
          infoMessage = "Select department and provide branches";
          break;
        }
        // find workFLow id from departments array using its names
        const workFlowId2 = departments.find(
          (item) => item.department === departmentSelection
        );
        // find branches ids from branches array by using names in selectedBranches array
        const branchesIds = branches
          ?.filter((branch) => selectedBranches.includes(branch.name))
          ?.map((branch) => branch.departments.map((dep) => dep._id))
          .flat();
        workFlow = workFlowId2?._id;
        connectors = branchesIds;
        break;
    }

    if (infoMessage) {
      toast.info(infoMessage);
      return;
    }
    if (workFlow) {
      setWorkFlow(workFlow);
    }
    if (connectors.length !== 0) {
      setConnectors(connectors);
    }
    setActiveStep(1);
  };
  // handle step
  const handlePreviousClick = () => {
    setActiveStep(0);
  };
  useEffect(() => {
    fetchBranches();
    getDepartments();
  }, []);
  return (
    <>
      <Stack flexDirection="row">
        <div
          className="cardDesign"
          style={{
            width: "100%",
            margin: '5px',
            maxWidth: '800px',
            marginTop: "16px",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          <Stepper activeStep={activeStep} alternativeLabel>
            <Step>
              <StepLabel>Provide Process Details</StepLabel>
              {activeStep === 1 ? (
                <Stack alignItems="center">
                  <Button onClick={handlePreviousClick}>
                    Previous
                  </Button>
                </Stack>
              ) : null}
            </Step>
            <Step>
              <StepLabel>Initiate Process</StepLabel>
            </Step>
          </Stepper>
          {activeStep === 0 ? (
            <>
              {!loading && (
                <Stack
                  mt={2}
                >
                  <div style={{ marginBottom: "25px" }}>
                    <Typography
                      variant="body1"
                      component="span"
                      gutterBottom
                      sx={{
                        textAlign: "center",
                        height: 50,
                        fontWeight: 400,
                        margin: "10px",
                      }}
                    >
                      1. Select Deparment to initiate process
                    </Typography>
                    <div className={styles.departmentList}>
                      <Select
                        fullWidth
                        value={departmentSelection}

                        sx={{ backgroundColor: "white" }}
                        onChange={(e) => {
                          setSelectedDepartment(e.target?.value);
                          setDepartmentSelection(e.target?.value?.department);
                        }}
                        displayEmpty
                        renderValue={(selected) =>
                          selected === "" ? "Select Department" : selected
                        }
                      >
                        {departments.map((department) => (
                          <MenuItem
                            key={department.department}
                            value={department}
                          >
                            {department.department}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div style={{ marginBottom: "25px" }}>
                    <Typography
                      variant="body1"
                      component="span"
                      gutterBottom
                      sx={{
                        textAlign: "center",
                        height: 50,
                        fontWeight: 400,

                        margin: "10px",
                      }}
                    >
                      2. Select Type of process to initiate
                    </Typography>
                    <div className={styles.processType}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          setProcessType("intra");
                          setConnectors([])
                          setSelectedDepartments([]);
                          setSelectedHeadDepartments([]);
                        }}
                        // size="large"
                        sx={{
                          bgcolor:
                            processType === "intra" ? "#e5e5ff" : "white",
                          "&:hover": {
                            bgcolor: "#0000FF11",
                          },
                          width: "49%",
                          height: "48px",
                          display: "flex",
                          justifyContent: "flex-start",
                        }}
                      >
                        {processType === "intra" ? (
                          <IconCircleCheckFilled
                            style={{ marginRight: "5px" }}
                            size={20}
                          />
                        ) : (
                          <IconCircle style={{ marginRight: "7px" }} size={18} />
                        )}
                        Intra Branch
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setProcessType("inter")}
                        // size="large"
                        sx={{
                          bgcolor:
                            processType === "inter" ? "#e5e5ff" : "white",
                          "&:hover": {
                            bgcolor: "#0000FF11",
                          },
                          width: "49%",
                          height: "48px",
                          display: "flex",
                          justifyContent: "flex-start",
                        }}
                      >
                        {processType === "inter" ? (
                          <IconCircleCheckFilled
                            style={{ marginRight: "5px" }}
                            size={20}
                          />
                        ) : (
                          <IconCircle style={{ marginRight: "7px" }} size={18} />
                        )}
                        Inter Branch
                      </Button>
                    </div>
                  </div>
                  {processType === "inter" && !depBelongsToHeadoffice && (
                    <>
                      <div style={{ marginBottom: "25px" }}>
                        <Typography
                          variant="body1"
                          component="span"
                          gutterBottom
                          sx={{
                            width: 350,
                            height: 50,
                            fontWeight: 400,
                            margin: "10px",
                          }}
                        >
                          3. Is head-office included in process ?
                        </Typography>
                        <div className={styles.headOfficeInclude}>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                              setHeadofficeInclude(true);
                              setSelectedBranches([]);
                            }}
                            // size="large"
                            sx={{
                              bgcolor: headofficeInclude
                                ? "#e5e5ff"
                                : "white",
                              "&:hover": {
                                bgcolor: "#0000FF11",
                              },
                              display: "flex",
                              width: "49%",
                              height: "48px",
                              justifyContent: "flex-start",
                            }}
                          >
                            {headofficeInclude ? (
                              <IconCircleCheckFilled
                                style={{ marginRight: "5px" }}
                                size={20}
                              />
                            ) : (
                              <IconCircle
                                style={{ marginRight: "7px" }}
                                size={18}
                              />
                            )}
                            Yes
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                              setHeadofficeInclude(false);
                              setManagerDep(null);
                            }}
                            // size="large"
                            sx={{
                              bgcolor: !headofficeInclude
                                ? "#e5e5ff"
                                : "white",
                              "&:hover": {
                                bgcolor: "#0000FF11",
                              },
                              width: "49%",
                              height: "48px",
                              display: "flex",
                              justifyContent: "flex-start",
                            }}
                          >
                            {!headofficeInclude ? (
                              <IconCircleCheckFilled
                                style={{ marginRight: "5px" }}
                                size={20}
                              />
                            ) : (
                              <IconCircle
                                style={{ marginRight: "7px" }}
                                size={18}
                              />
                            )}
                            No
                          </Button>
                        </div>
                      </div>
                      {headofficeInclude ? (
                        <div style={{ marginBottom: "25px" }}>
                          <Typography
                            variant="body1"
                            component="span"
                            gutterBottom
                            sx={{
                              textAlign: "center",
                              width: 350,
                              height: 50,
                              fontWeight: 400,
                              margin: "10px",
                            }}
                          >
                            4. Select headoffice department
                          </Typography>
                          <div className={styles.managerDep}>
                            <Autocomplete
                              disablePortal
                              fullWidth
                              id="combo-box-department"

                              onChange={handleChangeManagerDep}
                              options={headOfficeDepartments || []}
                              value={
                                headOfficeDepartments?.filter(
                                  (item) => item.name === managerDep
                                )[0] || null
                              }
                              getOptionLabel={(option) => option.name}
                              renderOption={(props, option) => (
                                <Box component="li" {...props}>
                                  {option.name}
                                </Box>
                              )}
                              sx={{ backgroundColor: "white" }}
                              renderInput={(params) => <TextField {...params} />}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: "25px" }}>
                          <Typography
                            variant="body1"
                            component="span"
                            gutterBottom
                            sx={{
                              textAlign: "center",
                              width: 350,
                              height: 50,
                              fontWeight: 400,
                              margin: "10px",
                            }}
                          >
                            4. Select receiver branches
                          </Typography>
                          <div className={styles.receiverBranches}>
                            <Autocomplete
                              multiple
                              sx={{ backgroundColor: "white" }}

                              id="checkboxes-tags-demo"
                              options={branches
                                ?.filter(
                                  (item) =>
                                    item.name !== "headOffice" &&
                                    item.departments.length > 0
                                )
                                ?.filter(
                                  (item) =>
                                    !departmentSelection.includes(item.name)
                                )
                                ?.filter((item) => item.departments.length >= 0)
                                ?.map((branch) => branch.name)}
                              disableCloseOnSelect
                              getOptionLabel={(option) => option}
                              renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                  <Checkbox
                                    icon={
                                      <CheckboxOutlineBlankIcon font />
                                    }
                                    checkedIcon={
                                      <CheckboxIcon font />
                                    }
                                    style={{ marginRight: 8 }}
                                    checked={selected}
                                  />
                                  <ListItemText primary={option} />
                                </li>
                              )}
                              fullWidth
                              renderInput={(params) => (
                                <TextField {...params} variant="outlined" />
                              )}
                              value={selectedBranches}
                              onChange={handleCommanBranchChange}
                              renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                  <Chip
                                    variant="outlined"
                                    label={option}
                                    {...getTagProps({ index })}
                                  />
                                ))
                              }
                            />
                            <FormControlLabel
                              sx={{
                                justifyContent: "flex-end",
                              }}
                              control={
                                <Checkbox
                                  disabled={branches
                                    ?.filter(
                                      (item) =>
                                        item.name !== "headOffice" &&
                                        item.departments.length > 0
                                    )
                                    ?.filter(
                                      (item) =>
                                        !departmentSelection.includes(item.name)
                                    )
                                    ?.filter((item) => item.departments.length >= 0)
                                    ?.map((branch) => branch.name).length == 0}
                                  checked={selectAllCheckBranches}
                                  // disabled={!selectedBranch}
                                  onChange={handleSelectAllBranches}
                                  name="selectAllBranches"
                                />
                              }
                              label="Select all branches"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {processType === "inter" && depBelongsToHeadoffice && (
                    <div style={{ marginBottom: "25px" }}>
                      <Typography
                        variant="body1"
                        component="span"
                        gutterBottom
                        sx={{
                          width: 350,
                          height: 50,
                          fontWeight: 400,
                          margin: "10px",
                        }}
                      >
                        3. Select receiver departments
                      </Typography>
                      <div className={styles.receiverBranches}>
                        <p>Headoffice Departments :</p>
                        <Autocomplete
                          multiple

                          sx={{ maxWidth: "400px" }}
                          id="checkboxes-tags-demo"
                          options={headOfficeDepartments
                            ?.filter((dep) => dep.name !== departmentSelection)
                            ?.map((dep) => dep.name)}
                          disableCloseOnSelect
                          getOptionLabel={(option) => option}
                          renderOption={(props, option, { selected }) => (
                            <li {...props}>
                              <Checkbox
                                icon={
                                  <CheckboxOutlineBlankIcon font />
                                }
                                checkedIcon={<CheckboxIcon font />}
                                style={{ marginRight: 8 }}
                                checked={selected}
                              />
                              <ListItemText primary={option} />
                            </li>
                          )}
                          fullWidth
                          renderInput={(params) => (
                            <TextField {...params} variant="outlined" />
                          )}
                          value={selectedHeadDepartments}
                          onChange={handleHeadDepartmentsSelect}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                              />
                            ))
                          }
                        />
                        <FormControlLabel
                          sx={{
                            justifyContent: "flex-end",
                            maxWidth: "400px",
                          }}
                          control={
                            <Checkbox
                              checked={selectAllCheckHeadDepartments}

                              // disabled={!selectedBranch}
                              onChange={handleSelectAllHeadDepartments}
                              name="selectAllDepartments"
                            />
                          }
                          label="Select all departments"
                        />
                        <p>Normal branches :</p>
                        <Autocomplete
                          multiple

                          sx={{ maxWidth: "400px" }}
                          id="checkboxes-tags-demo"
                          options={branches
                            ?.filter(
                              (item) => !departmentSelection.includes(item.name)
                            )
                            ?.filter((item) => item.departments.length > 0)
                            ?.map((branch) => branch.name)}
                          disableCloseOnSelect
                          getOptionLabel={(option) => option}
                          renderOption={(props, option, { selected }) => (
                            <li {...props}>
                              <Checkbox
                                icon={
                                  <CheckboxOutlineBlankIcon font />
                                }
                                checkedIcon={<CheckboxIcon font />}
                                style={{ marginRight: 8 }}
                                checked={selected}
                              />
                              <ListItemText primary={option} />
                            </li>
                          )}
                          fullWidth
                          renderInput={(params) => (
                            <TextField {...params} variant="outlined" />
                          )}
                          value={selectedDepartments}
                          onChange={handleDepartmentsSelect}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                              />
                            ))
                          }
                        />

                        <FormControlLabel
                          sx={{
                            justifyContent: "flex-end",
                            maxWidth: "400px",
                          }}
                          control={
                            <Checkbox
                              checked={selectAllCheckDepartments}

                              // disabled={!selectedBranch}
                              onChange={handleSelectAllDepartments}
                              name="selectAllDepartments"
                            />
                          }
                          label="Select Branches"
                        />
                      </div>
                    </div>
                  )}
                  {/* buttons according to selections */}
                  {processType === "intra" && (
                    <Stack alignItems="center">
                      <Button
                        variant="contained"
                        onClick={() => handleProceed("1")}
                        sx={{ width: "fit-content", minWidth: "200px" }}
                      >
                        Proceed
                      </Button>
                    </Stack>
                  )}
                  {processType === "inter" && depBelongsToHeadoffice && (
                    <Stack alignItems="center">
                      <Button
                        variant="contained"
                        onClick={() => handleProceed("2")}
                        sx={{ width: "fit-content", minWidth: "200px" }}
                      >
                        Proceed
                      </Button>
                    </Stack>
                  )}
                  {processType === "inter" && !depBelongsToHeadoffice && (
                    <Stack alignItems="center" spacing={2}>
                      {headofficeInclude && (
                        <Button
                          variant="contained"
                          onClick={() => handleProceed("3")}
                          sx={{ width: "fit-content", minWidth: "200px" }}
                        >
                          Proceed
                        </Button>
                      )}
                      {!headofficeInclude && (
                        <Button
                          variant="contained"
                          onClick={handleProceed}
                          sx={{ width: "fit-content", minWidth: "200px" }}
                        >
                          Proceed
                        </Button>
                      )}
                    </Stack>
                  )}
                </Stack>
              )}
            </>
          ) : null}
          {activeStep === 1 ? (
            <InitiatProcess
              workFlow={workFlow}
              setWorkFlow={setWorkFlow}
              connectors={connectors}
              setConnectors={setConnectors}
              isHeadofficeIncluded={headofficeInclude}
              selectedDepartment={selectedDepartment}
              initiatorDepartment={departmentSelection}
              setSelectedDepartment={setSelectedDepartment}
              interBranch={processType === "intra" ? false : true}
            />
          ) : null}
        </div>
      </Stack>
    </>
  );
}
